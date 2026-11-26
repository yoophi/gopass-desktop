import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { highlightPath, matchPaths, searchTerms } from "@gopass/entries";
import { LuKeyRound, LuSearch } from "react-icons/lu";
import { Input } from "@gopass/ui/components/input";
import { entryListOptions, copyEntry } from "@/entities/entry";
import { hint, plain } from "@/shared/ui/styles";

export function QuickSearch() {
  const entries = useQuery(entryListOptions);
  const [query, setQuery] = useState("");
  const [index, select] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const composing = useRef(false);
  const pending = useRef(false);
  const terms = searchTerms(query);
  const results = matchPaths(entries.data ?? [], terms).slice(0, 15);
  const current = Math.min(index, Math.max(0, results.length - 1));
  useEffect(() => {
    const focus = () => input.current?.focus();
    focus();
    window.addEventListener("focus", focus);
    return () => window.removeEventListener("focus", focus);
  }, []);
  useEffect(() => { document.getElementById("row-"+current)?.scrollIntoView({block:"nearest"}); }, [current]);
  async function close() {
    try { await invoke("close_search"); } catch (e) { setError(String(e)); }
  }
  async function copy(path: string) {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError("");
    try { await copyEntry(path); await close(); }
    catch (e) { setError("복사 실패 · " + String(e)); }
    finally { pending.current = false; setBusy(false); input.current?.focus(); }
  }
  function onKey(event: KeyboardEvent<HTMLInputElement>) {
    if (composing.current || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
    if (event.key === "Escape") { event.preventDefault(); void close(); return; }
    if (!results.length || pending.current) return;
    if (event.key === "Enter") { event.preventDefault(); void copy(results[current]); }
    else if (["Tab","ArrowDown","ArrowUp"].includes(event.key)) {
      event.preventDefault();
      const step = event.key === "ArrowUp" || event.shiftKey ? -1 : 1;
      select(Math.max(0,Math.min(results.length-1,current+step)));
    }
  }
  return <main className="flex h-screen flex-col gap-3 p-4">
    <div className="relative">
      <LuSearch aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
      <Input ref={input} autoFocus role="combobox" aria-label="빠른 검색" placeholder="경로 검색" className="h-11 bg-white pl-10 text-base md:text-base" aria-expanded={results.length>0}
      aria-controls="matches" aria-activedescendant={results.length ? "row-"+current : undefined}
      value={query} onChange={e=>{setQuery(e.target.value);select(0);}}
      onCompositionStart={()=>{composing.current=true;}} onCompositionEnd={()=>{composing.current=false;}}
      onKeyDown={onKey} />
    </div>
    {entries.isPending && <p role="status" className={hint}>목록을 불러오는 중입니다.</p>}
    {entries.isError && <button className={plain + " justify-self-start self-start"} onClick={()=>void entries.refetch()}>목록 조회 다시 시도</button>}
    {entries.isSuccess && !results.length && <p className={hint}>검색 결과가 없습니다.</p>}
    <ul role="listbox" id="matches" aria-label="검색 결과" className="min-h-0 flex-1 overflow-y-auto">{results.map((path,i)=>
      <li role="option" key={path} id={"row-"+i} aria-selected={current===i}
        className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-white aria-selected:bg-ring/15"
        onMouseDown={e=>e.preventDefault()} onClick={()=>void copy(path)}>
        <LuKeyRound aria-hidden className="shrink-0 text-muted-foreground" />
        <span className="grid min-w-0">
          <span className="truncate font-semibold">{path.slice(path.lastIndexOf("/") + 1)}</span>
          <span className="truncate text-sm text-muted-foreground">
            {highlightPath(path,terms).map(({text,match},n)=>match ? <mark key={n} className="rounded-sm bg-ring/25 font-semibold text-[#183329]">{text}</mark> : text)}
          </span>
        </span>
      </li>)}</ul>
    {busy && <p role="status" className={hint}>복사 중…</p>}
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <p aria-hidden className="border-t border-input pt-2 text-xs text-muted-foreground">↑↓ 이동 · Enter 복사 · Esc 닫기</p>
  </main>;
}
