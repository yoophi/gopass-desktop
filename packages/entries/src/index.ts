/** Each host supplies its own transport for reading paths. */
export interface EntryCatalog {
  listPaths(): Promise<string[]>;
}

export function filterEntryPaths(paths: readonly string[], term: string): readonly string[] {
  const query = term.trim().toLowerCase();
  return query ? paths.filter((path) => path.toLowerCase().includes(query)) : paths;
}
export { generatePassword, ratePassword } from "./password";
export { searchTerms, matchPaths, highlightPath } from "./search";
