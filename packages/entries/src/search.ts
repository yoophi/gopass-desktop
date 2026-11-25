export function searchTerms(query: string) {
  return [...new Set(query.toLowerCase().trim().split(/\s+/).filter(Boolean))];
}

export function matchPaths(paths: readonly string[], terms: readonly string[]) {
  return paths.filter(path => terms.every(term => path.toLowerCase().includes(term)));
}

export function highlightPath(path: string, terms: readonly string[]) {
  if (!terms.length) return [{ text: path, match: false }];
  const escape = (term: string) => term.replace(/[.*+?${}()|[\]\\]/g, "\\$&");
  const pattern = [...terms].sort((a,b) => b.length-a.length).map(escape).join("|");
  return path.split(new RegExp("(" + pattern + ")", "gi"))
    .map((text, index) => ({ text, match: index % 2 === 1 }));
}
