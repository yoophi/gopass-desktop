import { invoke } from "@tauri-apps/api/core";

export const readEntry = (path: string) => invoke<string>("read_entry", { path });
export const copyEntry = (path: string) => invoke<void>("copy_entry", { path });
export const saveEntry = (path: string, value: string, editing: boolean) =>
  invoke<void>("save_entry", { path, value, editing });
export const removeEntry = (path: string) => invoke<void>("remove_entry", { path });
export const entryHistory = (path: string) => invoke<[string, string, string][]>("entry_history", { path });
