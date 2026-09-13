import { ChatMessage, MessageRole } from "../../generated";
import { useConfigStore, useChatStore, useHistoryStore } from "@/stores";
import { useRef, useState } from "react";

const convertToHistory = (messages: ChatMessage[]) =>
  messages
    .filter((m) => !m.is_error_message && m.content)
    .map((message) => ({
      role: message.role === MessageRole.USER ? "user" : "assistant",
      content: message.content,
    }));

type StreamEvent =
  | { type: "status"; data: string }
  | { type: "sources"; data: any[] }
  | { type: "text"; data: string }
  | { type: "thinking"; data: string }
  | { type: "agent"; data: { steps_details: any[] } }
  | { type: "done"; data: { model: string; mode: string } }
  | { type: "error"; data: string };

const mapSource = (c: any) => {
  if (typeof c === "string") {
    try {
      return { title: new URL(c).hostname, url: c, content: "" };
    } catch {
      return { title: c, url: c, content: "" };
    }
  }
  let domain = "example.com";
  if (c.url) {
    try {
      domain = new URL(c.url).hostname;
    } catch {}
  }
  return {
    title: c.title || domain,
    url: c.url || "",
    content: c.snippet || c.cited_text || "",
  };
};

export const useChat = () => {
  const { addMessage, messages, threadId, setThreadId } = useChatStore();
  const { model, mode } = useConfigStore();
  const saveThread = useHistoryStore((state) => state.saveThread);

  const [streamingMessage, setStreamingMessage] = useState<ChatMessage | null>(
    null,
  );
  const [streamingStatus, setStreamingStatus] = useState<string | null>(null);
  const [streamingThinking, setStreamingThinking] = useState<string | null>(null);
  const [isStreamingProSearch, setIsStreamingProSearch] = useState(false);
  const [isStreamingMessage, setIsStreamingMessage] = useState(false);

  // Refs mirror state so the stream reader always sees the latest values
  // without re-creating the async loop.
  const messageRef = useRef<ChatMessage | null>(null);
  const historyRef = useRef<ChatMessage[]>([]);

  const updateStream = (patch: Partial<ChatMessage>) => {
    if (!messageRef.current) return;
    messageRef.current = { ...messageRef.current, ...patch };
    setStreamingMessage({ ...messageRef.current });
  };

  const handleSend = async (query: string) => {
    const state: ChatMessage = {
      role: MessageRole.ASSISTANT,
      content: "",
      sources: [],
      related_queries: [],
      images: [],
      agent_response: null,
    };
    messageRef.current = { ...state };
    historyRef.current = [...messages];

    addMessage({ role: MessageRole.USER, content: query });
    setIsStreamingProSearch(mode === "research" || mode === "deepsearch");
    setIsStreamingMessage(true);
    setStreamingMessage({ ...state });

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: query,
          model,
          mode,
          history: convertToHistory(historyRef.current),
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error(await res.text());
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let sawText = false;

      const handleEvent = (evt: StreamEvent) => {
        switch (evt.type) {
          case "status":
            setStreamingStatus(evt.data);
            break;
          case "sources":
            updateStream({ sources: evt.data.map(mapSource) });
            break;
          case "text":
            sawText = true;
            setStreamingThinking(null);
            updateStream({
              content: (messageRef.current?.content || "") + evt.data,
            });
            break;
          case "thinking":
            if (!sawText) {
              setStreamingThinking(
                (streamingThinking) => (streamingThinking || "") + evt.data,
              );
            }
            break;
          case "agent":
            updateStream({ agent_response: evt.data });
            break;
          case "error":
            throw new Error(evt.data);
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
          if (!trimmed) continue;
          try {
            handleEvent(JSON.parse(trimmed) as StreamEvent);
          } catch (e) {
            if (e instanceof Error && e.message && !(e instanceof SyntaxError)) {
              throw e;
            }
            // ignore malformed lines
          }
        }
      }

      const finalMessage: ChatMessage = messageRef.current
        ? { ...messageRef.current }
        : { ...state, content: "Empty response from model." };

      addMessage(finalMessage);

      let currentThreadId = threadId;
      if (!currentThreadId) {
        currentThreadId = Date.now();
        setThreadId(currentThreadId);
      }

      saveThread(
        currentThreadId,
        [
          ...historyRef.current,
          { role: MessageRole.USER, content: query },
          finalMessage,
        ],
        model,
      );
    } catch (e: any) {
      addMessage({
        role: MessageRole.ASSISTANT,
        content: e.message || "An error occurred",
        related_queries: [],
        sources: [],
        images: [],
        agent_response: null,
        is_error_message: true,
      });
    } finally {
      messageRef.current = null;
      setStreamingMessage(null);
      setStreamingStatus(null);
      setStreamingThinking(null);
      setIsStreamingMessage(false);
      setIsStreamingProSearch(false);
    }
  };

  return {
    handleSend,
    streamingMessage,
    streamingStatus,
    streamingThinking,
    isStreamingMessage,
    isStreamingProSearch,
  };
};
