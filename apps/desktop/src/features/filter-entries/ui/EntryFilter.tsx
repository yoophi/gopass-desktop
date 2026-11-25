import { Input } from "@gopass/ui/components/input";
import { useEntryFilter } from "../model/filter";

export function EntryFilter() {
  const { term, setTerm } = useEntryFilter();
  return (
    <label className="grid gap-2 font-medium">
      경로 검색
      <Input type="search" value={term} onChange={(event) => setTerm(event.target.value)} />
    </label>
  );
}
