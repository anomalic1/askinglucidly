import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ConfigStore, createConfigSlice, SearchMode } from "./slices/configSlice";
import { createMessageSlice, ChatStore } from "./slices/messageSlice";
import { createHistorySlice, HistoryStore } from "./slices/historySlice";

export type { SearchMode };

type StoreState = ChatStore & ConfigStore & HistoryStore;

const useStore = create<StoreState>()(
  persist(
    (...a) => ({
      ...createMessageSlice(...a),
      ...createConfigSlice(...a),
      ...createHistorySlice(...a),
    }),
    {
      name: "store",
      partialize: (state) => ({
        model: state.model,
        localMode: state.localMode,
        proMode: state.proMode,
        mode: state.mode,
        history: state.history,
        threads: state.threads,
      }),
    },
  ),
);

export const useChatStore = () =>
  useStore((state) => ({
    messages: state.messages,
    addMessage: state.addMessage,
    setMessages: state.setMessages,
    threadId: state.threadId,
    setThreadId: state.setThreadId,
  }));

export const useConfigStore = () =>
  useStore((state) => ({
    localMode: state.localMode,
    toggleLocalMode: state.toggleLocalMode,
    model: state.model,
    setModel: state.setModel,
    proMode: state.proMode,
    toggleProMode: state.toggleProMode,
    mode: state.mode,
    setMode: state.setMode,
  }));

export const useHistoryStore = <T>(selector: (state: StoreState) => T): T =>
  useStore(selector);
