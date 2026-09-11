import { ThreadResponse } from "../../generated";
import { useHistoryStore } from "@/stores";
import { useEffect, useState } from "react";

export const useChatThread = (threadId?: number) => {
  const storeThreads = useHistoryStore((state) => state.threads);
  const [thread, setThread] = useState<ThreadResponse | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (threadId && storeThreads[threadId]) {
      setThread(storeThreads[threadId]);
    } else {
      setThread(null);
    }
  }, [threadId, storeThreads]);

  return {
    data: mounted ? thread : null,
    isLoading: !mounted,
    error: null
  };
};
