import { EntryTree } from "@/features/browse-entries";
import { useState } from "react";
import { EntryEditor } from "@/features/manage-entry";
import { filterEntryPaths } from "@gopass/entries";
import { useQuery } from "@tanstack/react-query";
import { entryListOptions } from "@/entities/entry";
import { EntryFilter, useEntryFilter } from "@/features/filter-entries";

export function ExplorerPage() {
  const [selection, setSelection] = useState<string | null | undefined>();
  const entries = useQuery(entryListOptions);
  const term = useEntryFilter((state) => state.term);
  const paths = entries.data && filterEntryPaths(entries.data, term);

  return (
    <main className="mx-auto grid max-w-3xl gap-6 p-8">
      <h1 className="text-3xl font-semibold">저장소 탐색기</h1>
      <button onClick={() => setSelection(null)}>새 항목</button>
      {selection !== undefined && <EntryEditor key={JSON.stringify(selection)} path={selection} close={() => setSelection(undefined)} saved={setSelection} />}
      <EntryFilter />
      {entries.isPending && <p role="status">목록을 불러오는 중입니다.</p>}
      {entries.isError && (
        <div role="alert">
          <p>목록을 읽을 수 없습니다. gopass 설치와 저장소 설정을 확인하세요.</p>
          <button className="mt-2 underline" onClick={() => void entries.refetch()}>다시 시도</button>
        </div>
      )}
      {paths?.length === 0 && <p>{entries.data?.length ? "검색 결과가 없습니다." : "저장소가 비어 있습니다."}</p>}
      {paths && paths.length > 0 && (
        <EntryTree key={JSON.stringify([!!term, paths])} paths={paths} searching={!!term} open={setSelection} />
      )}
    </main>
  );
}
