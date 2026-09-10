import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { ChatModel } from "../../generated";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isLocalModel(model: ChatModel) {
  return false; // No local models supported anymore
}

export function isCloudModel(model: ChatModel) {
  return [
    ChatModel.SONAR_FREE,
    ChatModel.NEMOTRON_3_SUPER,
    ChatModel.NEMOTRON_3_ULTRA,
    ChatModel.LING_3_0_FLASH_SANTE,
    ChatModel.DOTS_3_NOTE_PREVIEW,
    ChatModel.NEMOTRON_3_5_LIGHTNING,
    ChatModel.LING_3_0_FLASH_FIN,
  ].includes(model);
}

const GUEST_MSG_KEY = "asklucidly_guest_msgs";

export function getGuestMessageCount(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(GUEST_MSG_KEY) || "0", 10);
}

export function incrementGuestMessageCount(): number {
  const count = getGuestMessageCount() + 1;
  localStorage.setItem(GUEST_MSG_KEY, String(count));
  return count;
}

export function resetGuestMessageCount(): void {
  localStorage.removeItem(GUEST_MSG_KEY);
}
