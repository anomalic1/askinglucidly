import { StateCreator } from "zustand";
import { ChatModel } from "../../../generated";

export type SearchMode = "ask" | "research" | "deepsearch";

type State = {
  model: ChatModel;
  localMode: boolean;
  proMode: boolean;
  mode: SearchMode;
};

type Actions = {
  setModel: (model: ChatModel) => void;
  toggleLocalMode: () => void;
  toggleProMode: () => void;
  setMode: (mode: SearchMode) => void;
};

export type ConfigStore = State & Actions;

export const createConfigSlice: StateCreator<
  ConfigStore,
  [],
  [],
  ConfigStore
> = (set) => ({
  model: ChatModel.SONAR_FREE,
  localMode: false,
  proMode: false,
  mode: "ask",
  setModel: (model: ChatModel) => set({ model }),
  toggleLocalMode: () =>
    set((state) => ({ ...state, localMode: false })),
  toggleProMode: () =>
    set((state) => ({ proMode: !state.proMode })),
  setMode: (mode: SearchMode) => set({ mode }),
});
