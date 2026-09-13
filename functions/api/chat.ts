import {
  BASE_SYSTEM_PROMPT,
  DEEP_RESEARCH_SYSTEM_PROMPT,
} from "./prompts.gen";

interface Env {
  NAGA_API_KEY: string;
  SERPER_API_KEY?: string;
  TAVILY_API_KEY?: string;
}

type PagesFunction<Env = any> = (context: {
  request: Request;
  env: Env;
}) => Response | Promise<Response>;

type SearchMode = "ask" | "research" | "deepsearch";

interface HistoryMessage {
  role: string;
  content: string;
}

interface Source {
  title: string;
  url: string;
  snippet: string;
}

const NAGA_BASE = "https://api.naga.ac/v1";
const encoder = new TextEncoder();

const event = (type: string, data: any) =>
  encoder.encode(JSON.stringify({ type, data }) + "\n");

const isSonar = (model: string) => model.startsWith("sonar");

const domainOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

/** Fresh date reminder in the format the fixed prompts describe. */
const currentDateReminder = () =>
  `<system-reminder>\n\n# Current Date\n\n${new Date().toUTCString()}\n\n</system-reminder>`;

const systemPromptFor = (mode: SearchMode) =>
  (mode === "research" || mode === "deepsearch"
    ? DEEP_RESEARCH_SYSTEM_PROMPT
    : BASE_SYSTEM_PROMPT) + "\n\n" + currentDateReminder();

async function tavilySearch(
  apiKey: string,
  query: string,
  opts: { maxResults: number; includeRawContent: boolean },
): Promise<any[]> {
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "advanced",
        max_results: opts.maxResults,
        include_raw_content: opts.includeRawContent,
      }),
    });
    const data: any = await res.json();
    return Array.isArray(data?.results) ? data.results : [];
  } catch (e) {
    console.error("[AskLucidly] Tavily error:", e);
    return [];
  }
}

const toSource = (r: any): Source => ({
  title: r.title || domainOf(r.url || ""),
  url: r.url || "",
  snippet: r.content || r.snippet || "",
});

/** Ask the model for follow-up search queries (research/deepsearch modes). */
async function generateFollowUpQueries(
  env: Env,
  model: string,
  query: string,
  contextDigest: string,
  count: number,
): Promise<string[]> {
  try {
    const res = await fetch(`${NAGA_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.NAGA_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: `You are a research planner. Given the original query and a digest of first-round search results, produce exactly ${count} diverse follow-up web search queries that fill information gaps. Respond with ONLY a JSON array of strings, nothing else.\n\nOriginal query: ${query}\n\nFirst-round digest:\n${contextDigest}`,
          },
        ],
        max_tokens: 200,
        stream: false,
      }),
    });
    if (!res.ok) return [];
    const data: any = await res.json();
    const text: string = data?.choices?.[0]?.message?.content ?? "";
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return [];
    const parsed = JSON.parse(match[0]);
    return Array.isArray(parsed)
      ? parsed.filter((q) => typeof q === "string" && q.trim().length > 0).slice(0, count)
      : [];
  } catch (e) {
    console.error("[AskLucidly] Follow-up query generation failed:", e);
    return [];
  }
}

const buildSearchContext = (sources: Source[], includeRaw: boolean) =>
  sources
    .map((s, i) => {
      let block = `[${i + 1}] ${s.title}\nURL: ${s.url}\n${s.snippet}`;
      if (includeRaw && (s as any).raw) {
        block += `\nFull content:\n${(s as any).raw}`;
      }
      return block;
    })
    .join("\n\n");

const dedupeSources = (sources: Source[]): Source[] => {
  const seen = new Set<string>();
  const out: Source[] = [];
  for (const s of sources) {
    if (!s.url || seen.has(s.url)) continue;
    seen.add(s.url);
    out.push(s);
  }
  return out;
};

/**
 * Streams an OpenAI-compatible chat completion, forwarding text deltas as
 * `text` events and reasoning deltas as `thinking` events. Returns the
 * collected citations (OpenRouter-style `citations` / `annotations`).
 */
async function streamChatCompletion(
  env: Env,
  controller: ReadableStreamDefaultController,
  messages: any[],
  model: string,
  maxTokens?: number,
): Promise<{ text: string; citations: Source[] }> {
  let response: Response | null = null;
  let errorText = "";
  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    attempt++;
    response = await fetch(`${NAGA_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.NAGA_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        ...(maxTokens ? { max_tokens: maxTokens } : {}),
      }),
    });

    if (!response.ok) {
      errorText = await response.text();
      console.log(
        `[AskLucidly] Attempt ${attempt} failed with status ${response.status}: ${errorText}`,
      );
      try {
        const errData = JSON.parse(errorText);
        const errorNested =
          typeof errData.error === "string" ? JSON.parse(errData.error) : errData.error;
        const errMsg = errorNested?.error?.message || errorNested?.message || "";
        if (
          (errMsg.includes("temporarily unavailable") || errMsg.includes("upstream provider")) &&
          attempt < maxAttempts
        ) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        }
      } catch (e) {}
      throw new Error(errorText || `Upstream returned ${response.status}`);
    }
    break;
  }

  if (!response || !response.ok) {
    throw new Error(errorText || "Request failed");
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  const citations: Source[] = [];
  const seenCitations = new Set<string>();

  const collectCitations = (raw: any) => {
    // OpenRouter-style top-level citations (array of URL strings)
    if (Array.isArray(raw?.citations)) {
      for (const c of raw.citations) {
        const url = typeof c === "string" ? c : c?.url;
        if (url && !seenCitations.has(url)) {
          seenCitations.add(url);
          citations.push({ title: domainOf(url), url, snippet: "" });
        }
      }
    }
    // Perplexity-style annotations
    const annotations =
      raw?.choices?.[0]?.delta?.annotations ?? raw?.choices?.[0]?.message?.annotations;
    if (Array.isArray(annotations)) {
      for (const a of annotations) {
        const url = a?.url || a?.cited_text;
        if (url && !seenCitations.has(url)) {
          seenCitations.add(url);
          citations.push({
            title: a?.title || domainOf(url),
            url,
            snippet: a?.cited_text || "",
          });
        }
      }
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") continue;
      try {
        const chunk = JSON.parse(payload);
        collectCitations(chunk);
        const delta = chunk?.choices?.[0]?.delta;
        if (delta?.reasoning) {
          controller.enqueue(event("thinking", delta.reasoning));
        }
        if (delta?.content) {
          text += delta.content;
          controller.enqueue(event("text", delta.content));
        }
      } catch (e) {
        // ignore malformed keep-alive chunks
      }
    }
  }

  return { text, citations };
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = (await context.request.json()) as {
      prompt?: string;
      model?: string;
      history?: HistoryMessage[];
      mode?: SearchMode;
    };
    const prompt = body.prompt;
    const userModel = body.model || "sonar:free";
    const mode: SearchMode =
      body.mode === "research" || body.mode === "deepsearch" ? body.mode : "ask";
    const history = Array.isArray(body.history) ? body.history.slice(-10) : [];

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt required" }), { status: 400 });
    }

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const systemPrompt = systemPromptFor(mode);
          const historyMessages = history
            .filter((m) => (m.role === "user" || m.role === "assistant") && m.content)
            .map((m) => ({ role: m.role, content: m.content }));

          // ---- Modes that run our own multi-round search ----
          if (mode === "research" || mode === "deepsearch" || (!isSonar(userModel) && mode === "ask")) {
            const steps: any[] = [];
            const emitAgent = () => controller.enqueue(event("agent", { steps_details: steps }));

            const stepTitles =
              mode === "ask"
                ? ["Searching the web"]
                : ["Searching the web", "Searching deeper", "Synthesizing answer"];

            stepTitles.forEach((step, i) =>
              steps.push({
                step_number: i,
                step,
                queries: [],
                results: [],
                status: i === 0 ? "current" : "default",
              }),
            );
            if (mode !== "ask") emitAgent();

            const deep = mode === "deepsearch";
            const maxResults = mode === "ask" ? 5 : deep ? 10 : 8;

            // Round 1: the original query
            controller.enqueue(event("status", "Searching the web"));
            const round1 = context.env.TAVILY_API_KEY
              ? await tavilySearch(context.env.TAVILY_API_KEY, prompt, {
                  maxResults,
                  includeRawContent: deep,
                })
              : [];
            if (!context.env.TAVILY_API_KEY) {
              console.warn("[AskLucidly] TAVILY_API_KEY not set. Falling back to non-search generation.");
            }

            let sources = dedupeSources(round1.map(toSource));
            steps[0].queries = [prompt];
            steps[0].results = sources.slice(0, 6);
            steps[0].status = "done";

            if (mode !== "ask") {
              steps[1].status = "current";
              emitAgent();
              controller.enqueue(event("sources", sources));

              // Round 2: model-generated follow-up queries
              controller.enqueue(event("status", "Searching deeper"));
              const digest = sources
                .slice(0, 6)
                .map((s, i) => `[${i + 1}] ${s.title}: ${s.snippet.slice(0, 300)}`)
                .join("\n");
              const followUps = context.env.TAVILY_API_KEY
                ? await generateFollowUpQueries(context.env, userModel, prompt, digest, deep ? 4 : 3)
                : [];

              if (followUps.length > 0) {
                steps[1].queries = followUps;
                emitAgent();
                const round2Results = await Promise.all(
                  followUps.map((q) =>
                    context.env.TAVILY_API_KEY
                      ? tavilySearch(context.env.TAVILY_API_KEY, q, {
                          maxResults: deep ? 6 : 4,
                          includeRawContent: deep,
                        })
                      : Promise.resolve([]),
                  ),
                );
                sources = dedupeSources([
                  ...sources,
                  ...round2Results.flat().map(toSource),
                ]).slice(0, deep ? 15 : 12);
              }
              steps[1].results = sources.slice(6, 14);
              steps[1].status = "done";
              steps[2].status = "current";
              emitAgent();
              controller.enqueue(event("sources", sources));
            } else {
              controller.enqueue(event("sources", sources));
            }

            if (mode !== "ask") controller.enqueue(event("status", "Synthesizing answer"));

            const rawBySource = new Map<string, string>();
            if (deep) {
              for (const r of [...round1]) {
                if (r?.url && r?.raw_content) rawBySource.set(r.url, r.raw_content.slice(0, 4000));
              }
            }
            const contextBlock =
              sources.length > 0
                ? `<search_context>\n${buildSearchContext(
                    sources.map((s) => ({ ...s, raw: rawBySource.get(s.url) })),
                    true,
                  )}\n</search_context>\n\n`
                : "";

            const userContent = `${contextBlock}Using the search context above when available, answer the user's query. Cite sources inline using plain numbered brackets like [1] or [2] that match the numbered sources above. If no search context is available, answer from your own knowledge and say so.\n\n<user_query>\n${prompt}\n</user_query>`;

            const messages = [
              { role: "system", content: systemPrompt },
              ...historyMessages,
              { role: "user", content: userContent },
            ];

            await streamChatCompletion(
              context.env,
              controller,
              messages,
              userModel,
              deep ? 4000 : undefined,
            );

            if (steps.length > 1) {
              steps[2].status = "done";
              emitAgent();
            }
            controller.enqueue(event("done", { model: userModel, mode }));
          } else {
            // ---- Sonar "ask" mode: native web search, streamed ----
            controller.enqueue(event("status", "Searching the web"));
            const messages = [
              { role: "system", content: systemPrompt },
              ...historyMessages,
              { role: "user", content: prompt },
            ];
            const result = await streamChatCompletion(
              context.env,
              controller,
              messages,
              userModel,
            );

            if (result.citations.length > 0) {
              controller.enqueue(event("sources", result.citations));
            } else {
              // Fallback: extract URLs mentioned in the answer as sources
              const urls = new Set<string>();
              const re = /(https?:\/\/[^\s\)\]]+)/g;
              let m: RegExpExecArray | null;
              while ((m = re.exec(result.text)) !== null) urls.add(m[1]);
              const fallback = Array.from(urls).slice(0, 8).map((url) => ({
                title: domainOf(url),
                url,
                snippet: "",
              }));
              if (fallback.length > 0) controller.enqueue(event("sources", fallback));
            }
            controller.enqueue(event("done", { model: userModel, mode }));
          }

          controller.close();
        } catch (err: any) {
          console.error("[AskLucidly] Stream error:", err);
          try {
            controller.enqueue(event("error", err?.message || "Stream failed"));
            controller.close();
          } catch (e) {
            // controller already closed
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err: any) {
    console.error("[AskLucidly] Exception:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
