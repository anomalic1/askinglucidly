"use client";

import { useChat } from "@/hooks/chat";
import { useChatStore } from "@/stores";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AskInput } from "./ask-input";

import { useChatThread } from "@/hooks/threads";
import { LoaderIcon, Github } from "lucide-react";
import { MessageRole } from "../../generated";
import MessagesList from "./messages-list";
import { StarterQuestionsList } from "./starter-questions";
import { useAuth } from "@/lib/auth";
import { getGuestMessageCount, incrementGuestMessageCount } from "@/lib/utils";
import { AuthModal } from "./auth-modal";

const useAutoScroll = (ref: React.RefObject<HTMLDivElement>) => {
  const { messages } = useChatStore();

  useEffect(() => {
    if (messages.at(-1)?.role === MessageRole.USER) {
      ref.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  }, [messages, ref]);
};

const useAutoResizeInput = (
  ref: React.RefObject<HTMLDivElement>,
  setWidth: (width: number) => void,
) => {
  const { messages } = useChatStore();

  useEffect(() => {
    const updatePosition = () => {
      if (ref.current) {
        setWidth(ref.current.scrollWidth);
      }
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("resize", updatePosition);
    };
  }, [messages, ref, setWidth]);
};

const useAutoFocus = (ref: React.RefObject<HTMLTextAreaElement>) => {
  useEffect(() => {
    ref.current?.focus();
  }, [ref]);
};

export const ChatPanel = ({ threadId }: { threadId?: number }) => {
  const searchParams = useSearchParams();
  const queryMessage = searchParams.get("q");
  const hasRun = useRef(false);

  const {
    handleSend,
    streamingMessage,
    streamingStatus,
    streamingThinking,
    isStreamingMessage,
    isStreamingProSearch,
  } = useChat();
  const { messages, setMessages, setThreadId } = useChatStore();
  const { data: thread, isLoading, error } = useChatThread(threadId);
  const { user } = useAuth();

  const [width, setWidth] = useState(0);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const messageBottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useAutoScroll(messageBottomRef);
  useAutoResizeInput(messagesRef, setWidth);
  useAutoFocus(inputRef);

  useEffect(() => {
    if (queryMessage && !hasRun.current) {
      setThreadId(null);
      hasRun.current = true;
      handleSend(queryMessage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryMessage]);

  useEffect(() => {
    if (!thread) return;
    setThreadId(thread.thread_id);
    setMessages(thread.messages || []);
  }, [threadId, thread, setMessages, setThreadId]);

  useEffect(() => {
    if (messages.length == 0) {
      setThreadId(null);
    }
  }, [messages, setThreadId]);

  const handleSendWithGate = async (query: string) => {
    // If user is logged in, always allow
    if (user) {
      await handleSend(query);
      return;
    }

    // Guest: check message count
    const count = getGuestMessageCount();
    if (count >= 1) {
      // Already used their free message, show auth modal
      setShowAuthModal(true);
      return;
    }

    // Allow the first message and increment count
    incrementGuestMessageCount();
    await handleSend(query);
  };

  return (
    <>
      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}
      {messages.length > 0 || threadId ? (
        isLoading ? (
          <div className="w-full flex justify-center items-center">
            <LoaderIcon className="animate-spin w-8 h-8" />
          </div>
        ) : (
          <div ref={messagesRef} className="pt-10 w-full relative">
            <MessagesList
              messages={messages}
              streamingMessage={streamingMessage}
              isStreamingMessage={isStreamingMessage}
              isStreamingProSearch={isStreamingProSearch}
              streamingThinking={streamingThinking}
              streamingStatus={streamingStatus}
              onRelatedQuestionSelect={handleSendWithGate}
            />
            <div ref={messageBottomRef} className="h-0" />
            <div
              className="bottom-12 fixed px-2 max-w-screen-md justify-center items-center md:px-2"
              style={{ width: `${width}px` }}
            >
              <AskInput isFollowingUp sendMessage={handleSendWithGate} />
            </div>
          </div>
        )
      ) : (
        <div className="w-full flex flex-col justify-center items-center">
          <div className="flex items-center justify-center mb-2">
            <span className="text-3xl font-light tracking-tight">Ask anything</span>
          </div>
          <a
            href="https://github.com/anomalic1/askinglucidly"
            target="_blank"
            rel="noopener noreferrer"
            className="mb-8 group flex items-center gap-2 rounded-full border border-border/50 bg-card/60 px-3 py-1 text-xs text-muted-foreground transition-all duration-200 hover:border-tint/50 hover:text-foreground hover:shadow-[0_0_16px_rgba(120,120,255,0.15)] no-underline"
          >
            <Github className="w-3.5 h-3.5" />
            <span>100% open source</span>
            <span className="text-muted-foreground/50 group-hover:text-tint transition-colors">→</span>
          </a>
          <AskInput sendMessage={handleSendWithGate} />
          <div className="w-full flex flex-row px-3 justify-between space-y-2 pt-1">
            <StarterQuestionsList handleSend={handleSendWithGate} />
          </div>
        </div>
      )}
    </>
  );
};
