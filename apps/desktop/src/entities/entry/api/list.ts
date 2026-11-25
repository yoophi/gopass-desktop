import type { EntryCatalog } from "@gopass/entries";
import { queryOptions } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";

const desktopCatalog: EntryCatalog = {
  listPaths: () => invoke<string[]>("list_entries"),
};

export const entryListOptions = queryOptions({
  queryKey: ["entries", "paths"],
  queryFn: desktopCatalog.listPaths,
  retry: false,
});
