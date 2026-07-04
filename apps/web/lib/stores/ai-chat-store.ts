import { create } from "zustand";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface AiChatStore {
  open: boolean;
  minimized: boolean;
  messages: ChatMessage[];
  pendingPrompt: string | null;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  setMinimized: (minimized: boolean) => void;
  addMessage: (message: ChatMessage) => void;
  updateLastMessage: (content: string) => void;
  clearMessages: () => void;
  askWithPrompt: (prompt: string) => void;
  consumePendingPrompt: () => string | null;
}

export const useAiChatStore = create<AiChatStore>((set, get) => ({
  open: false,
  minimized: false,
  messages: [],
  pendingPrompt: null,
  setOpen: (open) => set({ open, minimized: false }),
  toggle: () => set((s) => ({ open: !s.open, minimized: false })),
  setMinimized: (minimized) => set({ minimized }),
  addMessage: (message) => set((s) => ({ messages: [...s.messages, message] })),
  updateLastMessage: (content) =>
    set((s) => {
      const messages = [...s.messages];
      const last = messages[messages.length - 1];
      if (last && last.role === "assistant") messages[messages.length - 1] = { ...last, content };
      return { messages };
    }),
  clearMessages: () => set({ messages: [] }),
  askWithPrompt: (prompt) => set({ open: true, minimized: false, pendingPrompt: prompt }),
  consumePendingPrompt: () => {
    const prompt = get().pendingPrompt;
    set({ pendingPrompt: null });
    return prompt;
  },
}));
