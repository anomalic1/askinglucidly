import { useQuery } from "@tanstack/react-query";
import { ChatSnapshot } from "../../generated";
import { useHistoryStore } from "@/stores";
import { useEffect, useState } from "react";

export const useChatHistory = () => {
  // Use local state and hydration approach to avoid hydration mismatch
  const storeHistory = useHistoryStore((state) => state.history);
  const [history, setHistory] = useState<ChatSnapshot[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setHistory(storeHistory);
  }, [storeHistory]);

  return {
    data: mounted ? history : [],
    isLoading: !mounted,
    error: null
  };
};
