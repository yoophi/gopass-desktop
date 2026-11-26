import { LuSearch } from "react-icons/lu";
import { Input } from "@gopass/ui/components/input";
import { useEntryFilter } from "../model/filter";

export function EntryFilter() {
  const { term, setTerm } = useEntryFilter();
  return (
    <div className="relative max-w-md">
      <LuSearch aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
      <Input type="search" aria-label="경로 검색" placeholder="경로 검색" className="h-10 bg-white pl-9"
        onKeyDown={(event) => { if (event.key === "Escape") setTerm(""); }} value={term} onChange={(event) => setTerm(event.target.value)} />
    </div>
  );
}
