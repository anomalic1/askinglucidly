import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ConfigStore, createConfigSlice } from "./slices/configSlice";
import { createMessageSlice, ChatStore } from "./slices/messageSlice";
import { createHistorySlice, HistoryStore } from "./slices/historySlice";

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
  }));

export const useHistoryStore = <T>(selector: (state: StoreState) => T): T =>
  useStore(selector);
