import { create } from "zustand";

interface ShortcutsStore {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const useShortcutsStore = create<ShortcutsStore>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
