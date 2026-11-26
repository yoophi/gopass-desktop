import { filterEntryPaths } from "@gopass/entries";
import { useQuery } from "@tanstack/react-query";
import { LuKeyRound } from "react-icons/lu";
import { entryListOptions } from "@/entities/entry";
import { EntryFilter, useEntryFilter } from "@/features/filter-entries";
import { hint, plain } from "@/shared/ui/styles";

/** Lists every entry below `folder`; an empty folder means the whole store. */
export function ExplorerPage({ folder, open }: { folder: string; open: (path: string) => void }) {
  const entries = useQuery(entryListOptions);
  const term = useEntryFilter((state) => state.term);
  const paths = entries.data && filterEntryPaths(entries.data.filter(path => !folder || path.startsWith(folder + "/")), term);

  return (
    <div className="grid gap-4">
      <EntryFilter />
      {entries.isPending && <p role="status" className={hint}>목록을 불러오는 중입니다.</p>}
      {entries.isError && (
        <div role="alert" className="flex items-center gap-3 rounded-lg border border-input bg-white p-4">
          <p className="mr-auto text-destructive">목록을 읽을 수 없습니다. gopass 설치와 저장소 설정을 확인하세요.</p>
          <button className={plain + " shrink-0"} onClick={() => void entries.refetch()}>다시 시도</button>
        </div>
      )}
      {paths?.length === 0 && <p className={hint}>{entries.data?.length ? "검색 결과가 없습니다." : "저장소가 비어 있습니다."}</p>}
      {paths && paths.length > 0 && (
        <ul className="divide-y divide-input border-y border-input">
          {paths.map(path => <li key={path}>
            <button className="flex w-full items-center gap-3 px-2 py-3 text-left hover:bg-white focus-visible:outline-2" onClick={() => open(path)}>
              <LuKeyRound aria-hidden className="shrink-0 text-muted-foreground" />
              <span className="grid min-w-0">
                <span className="truncate font-semibold text-ring">{path.slice(path.lastIndexOf("/") + 1)}</span>
                <span className="truncate text-sm text-muted-foreground">{path}</span>
              </span>
            </button>
          </li>)}
        </ul>
      )}
    </div>
  );
}
