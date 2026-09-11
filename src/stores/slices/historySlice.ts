import { StateCreator } from "zustand";
import { ChatSnapshot, ThreadResponse, ChatMessage, MessageRole } from "../../../generated";

type State = {
  threads: Record<number, ThreadResponse>;
  history: ChatSnapshot[];
};

type Actions = {
  saveThread: (threadId: number, messages: ChatMessage[], model_name: string) => void;
  deleteThread: (threadId: number) => void;
};

export type HistoryStore = State & Actions;

export const createHistorySlice: StateCreator<
  HistoryStore,
  [],
  [],
  HistoryStore
> = (set) => ({
  threads: {},
  history: [],
  saveThread: (threadId: number, messages: ChatMessage[], model_name: string) => {
    set((state) => {
      const newThreads = {
        ...state.threads,
        [threadId]: { thread_id: threadId, messages },
      };

      const existingSnapshotIndex = state.history.findIndex(
        (s) => s.id === threadId
      );

      const userMessages = messages.filter(m => m.role === MessageRole.USER);
      const assistantMessages = messages.filter(m => m.role === MessageRole.ASSISTANT);

      const title = userMessages[0]?.content.slice(0, 50) || "New Chat";
      const preview = assistantMessages[0]?.content.slice(0, 100) || "";

      const snapshot: ChatSnapshot = {
        id: threadId,
        title,
        date: new Date().toISOString(),
        preview,
        model_name,
      };

      let newHistory = [...state.history];
      if (existingSnapshotIndex >= 0) {
        newHistory.splice(existingSnapshotIndex, 1);
      }
      newHistory.unshift(snapshot);

      return { threads: newThreads, history: newHistory };
    });
  },
  deleteThread: (threadId: number) => {
    set((state) => {
      const newThreads = { ...state.threads };
      delete newThreads[threadId];
      return {
        threads: newThreads,
        history: state.history.filter((s) => s.id !== threadId),
      };
    });
  },
});
