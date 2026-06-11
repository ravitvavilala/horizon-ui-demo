"use client";

import { create } from "zustand";

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  sql?: string | null;
  rationale?: string;
  rows?: Array<Record<string, unknown>>;
  columnNames?: string[];
  error?: string | null;
  tookMs?: number;
  pending?: boolean;
};

type ChatState = {
  open: boolean;
  messages: ChatMessage[];
  input: string;
  sending: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
  setInput: (v: string) => void;
  pushMessage: (m: ChatMessage) => void;
  updateMessage: (id: string, patch: Partial<ChatMessage>) => void;
  reset: () => void;
  setSending: (v: boolean) => void;
};

export const useChatStore = create<ChatState>((set) => ({
  open: false,
  messages: [],
  input: "",
  sending: false,
  setOpen: (v) => set({ open: v }),
  toggle: () => set((s) => ({ open: !s.open })),
  setInput: (v) => set({ input: v }),
  pushMessage: (m) => set((s) => ({ messages: [...s.messages, m] })),
  updateMessage: (id, patch) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    })),
  reset: () => set({ messages: [], input: "" }),
  setSending: (v) => set({ sending: v }),
}));
