interface Env {
  NAGA_API_KEY: string;
  SERPER_API_KEY?: string;
  TAVILY_API_KEY?: string;
}

type PagesFunction<Env = any> = (context: {
  request: Request;
  env: Env;
}) => Response | Promise<Response>;

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { prompt, model } = (await context.request.json()) as { prompt?: string, model?: string };
    const userModel = model || "sonar:free";

    if (!prompt) return new Response(JSON.stringify({ error: "Prompt required" }), { status: 400 });

    let finalPrompt = prompt;
    let manualCitations: any[] = [];

    // If it's not Sonar, we must manually fetch web results using Tavily (Serper kept as a commented-out backup)
    if (userModel !== "sonar:free") {
      if (!context.env.TAVILY_API_KEY) {
        console.warn("[AskLucidly] TAVILY_API_KEY not set. Falling back to non-search generation.");
      } else {
        try {
          const tavilyResRaw = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              api_key: context.env.TAVILY_API_KEY,
              query: prompt,
              search_depth: "advanced"
            })
          });
          const tavilyRes: any = await tavilyResRaw.json();

          if (tavilyRes && tavilyRes.results) {
             const topResults = tavilyRes.results.slice(0, 5);
             if (topResults.length > 0) {
                const searchContext = topResults.map((r: any, i: number) => `[${i + 1}] ${r.title}\n${r.content}\n${r.url}`).join("\n\n");
                finalPrompt = `Please answer the user's query based on the following web search context:\n\n${searchContext}\n\nQuery: ${prompt}`;

                manualCitations = topResults.map((r: any) => ({
                  title: r.title,
                  url: r.url,
                  snippet: r.content
                }));
             }
          }

          /* Keep serp integration aside because its not fast
          const serpRes = await fetch("https://google.serper.dev/search", {
            method: "POST",
            headers: {
              "X-API-KEY": context.env.SERPER_API_KEY,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ q: prompt })
          });

          if (serpRes.ok) {
            const serpData: any = await serpRes.json();
            const organic = serpData.organic || [];
            if (organic.length > 0) {
              const topResults = organic.slice(0, 5);
              const searchContext = topResults.map((r: any, i: number) => `[${i + 1}] ${r.title}\n${r.snippet}\n${r.link}`).join("\n\n");
              finalPrompt = `Please answer the user's query based on the following web search context:\n\n${searchContext}\n\nQuery: ${prompt}`;
              
              manualCitations = topResults.map((r: any) => ({
                title: r.title,
                url: r.link,
                snippet: r.snippet
              }));
            }
          }
          */
        } catch (e) {
          console.error("[AskLucidly] Tavily API error:", e);
        }
      }
    }

    let attempt = 0;
    const maxAttempts = 3;
    let response: Response | null = null;
    let errorText = "";

    while (attempt < maxAttempts) {
      attempt++;
      
      if (userModel === "sonar:free") {
        // Native Sonar API
        response = await fetch("https://api.naga.ac/v1/responses", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${context.env.NAGA_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "sonar:free",
            input: prompt, // Sonar native doesn't need finalPrompt injection
            tools: [{ type: "web_search" }],
          }),
        });
      } else {
        // Standard OpenAI compatible endpoints for Llama / Nemotron
        response = await fetch("https://api.naga.ac/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${context.env.NAGA_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: userModel,
            messages: [{ role: "user", content: finalPrompt }],
            stream: false
          }),
        });
      }

      if (!response.ok) {
        errorText = await response.text();
        console.log(`[AskLucidly] Attempt ${attempt} failed with status ${response.status}: ${errorText}`);
        
        try {
          const errData = JSON.parse(errorText);
          const errorNested = typeof errData.error === 'string' ? JSON.parse(errData.error) : errData.error;
          const errMsg = errorNested?.error?.message || errorNested?.message || "";
          
          if (errMsg.includes("temporarily unavailable") || errMsg.includes("upstream provider")) {
            console.log(`[AskLucidly] Upstream provider unavailable. Retrying...`);
            if (attempt < maxAttempts) {
              await new Promise((resolve) => setTimeout(resolve, 2000));
              continue;
            }
          }
        } catch (e) {}

        return new Response(JSON.stringify({ error: errorText }), { status: response.status });
      }

      break;
    }

    if (!response || !response.ok) {
      return new Response(JSON.stringify({ error: errorText || "Request failed" }), { status: response?.status || 500 });
    }

    const data: any = await response.json();
    let outputText = "";
    let citations: any[] = [];

    if (userModel === "sonar:free") {
      outputText = data?.output?.[0]?.content?.[0]?.text ?? "";
      citations = data?.output?.[0]?.content?.[0]?.annotations ?? [];
    } else {
      outputText = data?.choices?.[0]?.message?.content ?? "";
      citations = manualCitations; // from our Serper results
    }

    return new Response(
      JSON.stringify({
        text: outputText,
        citations: citations,
        model: userModel,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[AskLucidly] Exception:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
