import { create } from "zustand";

interface FilterState {
  term: string;
  setTerm: (term: string) => void;
}

export const useEntryFilter = create<FilterState>((set) => ({
  term: "",
  setTerm: (term) => set({ term }),
}));
