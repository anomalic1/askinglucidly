import { useMutation } from "@tanstack/react-query";
import {
  ChatMessage,
  ChatRequest,
  Message,
  MessageRole,
} from "../../generated";
import { useState } from "react";
import { useConfigStore, useChatStore, useHistoryStore } from "@/stores";

const convertToChatRequest = (query: string, history: ChatMessage[]) => {
  const newHistory: Message[] = history.map((message) => ({
    role:
      message.role === MessageRole.USER
        ? MessageRole.USER
        : MessageRole.ASSISTANT,
    content: message.content,
  }));
  return { query, history: newHistory };
};

export const useChat = () => {
  const { addMessage, messages, threadId, setThreadId } = useChatStore();
  const { model, proMode } = useConfigStore();
  const saveThread = useHistoryStore((state) => state.saveThread);

  const [streamingMessage, setStreamingMessage] = useState<ChatMessage | null>(
    null,
  );
  const [isStreamingProSearch, setIsStreamingProSearch] = useState(false);
  const [isStreamingMessage, setIsStreamingMessage] = useState(false);

  const { mutateAsync: chat } = useMutation<void, Error, ChatRequest>({
    retry: false,
    mutationFn: async (request) => {
      const state: ChatMessage = {
        role: MessageRole.ASSISTANT,
        content: "",
        sources: [],
        related_queries: [],
        images: [],
        agent_response: null,
      };
      addMessage({ role: MessageRole.USER, content: request.query });
      setIsStreamingProSearch(proMode);
      setIsStreamingMessage(true);
      setStreamingMessage({ ...state }); // show initial empty state/skeleton

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: request.query, model }),
        });

        if (!res.ok) {
          throw new Error(await res.text());
        }

        const data = await res.json();
        
        state.content = data.text;
        
        // Map our simple citations to what the UI expects for sources (title, url, text)
        if (data.citations && Array.isArray(data.citations)) {
           state.sources = data.citations.map((c: any) => ({
             title: c.title || new URL(c.url || "https://example.com").hostname,
             url: c.url,
             text: c.snippet || ""
           }));
        } else {
           state.sources = [];
        }
        
        // Visual chunk streaming
        const fullText = data.text || "";
        const chunks = fullText.split(" ");
        let currentText = "";
        
        for (let i = 0; i < chunks.length; i++) {
          currentText += (i === 0 ? "" : " ") + chunks[i];
          state.content = currentText;
          setStreamingMessage({ ...state });
          await new Promise((r) => setTimeout(r, 20)); // stream out 50 words per second
        }

        const finalMessage = { ...state };
        addMessage(finalMessage);

        let currentThreadId = threadId;
        if (!currentThreadId) {
          currentThreadId = Date.now();
          setThreadId(currentThreadId);
        }

        saveThread(currentThreadId, [...messages, { role: MessageRole.USER, content: request.query }, finalMessage], model);
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
        setStreamingMessage(null);
        setIsStreamingMessage(false);
        setIsStreamingProSearch(false);
      }
    },
  });

  const handleSend = async (query: string) => {
    await chat(convertToChatRequest(query, messages));
  };

  return {
    handleSend,
    streamingMessage,
    isStreamingMessage,
    isStreamingProSearch,
  };
};
