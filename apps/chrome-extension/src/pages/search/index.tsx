import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchTerms, matchPaths } from "@gopass/entries";
import { Input } from "@gopass/ui/components/input";
import { catalog } from "../../entities/entry";

export function SearchPage() {
  const [query,setQuery]=useState("");
  const result=useQuery({queryKey:["entries"],queryFn:catalog.listPaths,retry:false});
  const paths=matchPaths(result.data??[],searchTerms(query));
  return <main className="grid w-80 gap-2 p-3">
    <label>저장소 경로 검색<Input autoFocus value={query} onChange={e=>setQuery(e.target.value)} /></label>
    {result.isPending && <p role="status">목록을 불러오는 중입니다.</p>}
    {result.isError && <div role="alert"><p>로컬 호스트 연결을 확인하세요. {result.error.message}</p>
      <button onClick={()=>void result.refetch()}>다시 시도</button></div>}
    {result.isSuccess && !paths.length && <p>{result.data.length ? "검색 결과가 없습니다." : "빈 저장소입니다."}</p>}
    <ul className="max-h-96 overflow-y-auto">{paths.map(path=><li className="py-1" key={path}>{path}</li>)}</ul>
  </main>;
}
