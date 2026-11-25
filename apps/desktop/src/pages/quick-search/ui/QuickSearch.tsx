import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { highlightPath, matchPaths, searchTerms } from "@gopass/entries";
import { Input } from "@gopass/ui/components/input";
import { entryListOptions, copyEntry } from "@/entities/entry";

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
  return <main className="grid gap-3 p-4">
    <label>빠른 검색<Input ref={input} autoFocus role="combobox" aria-expanded={results.length>0}
      aria-controls="matches" aria-activedescendant={results.length ? "row-"+current : undefined}
      value={query} onChange={e=>{setQuery(e.target.value);select(0);}}
      onCompositionStart={()=>{composing.current=true;}} onCompositionEnd={()=>{composing.current=false;}}
      onKeyDown={onKey} /></label>
    {entries.isPending && <p role="status">목록을 불러오는 중입니다.</p>}
    {entries.isError && <button onClick={()=>void entries.refetch()}>목록 조회 다시 시도</button>}
    {entries.isSuccess && !results.length && <p>검색 결과가 없습니다.</p>}
    <ul role="listbox" id="matches" aria-label="검색 결과">{results.map((path,i)=>
      <li role="option" key={path} id={"row-"+i} aria-selected={current===i}
        className="cursor-pointer rounded px-2 py-1 aria-selected:bg-emerald-100"
        onMouseDown={e=>e.preventDefault()} onClick={()=>void copy(path)}>
        {highlightPath(path,terms).map(({text,match},n)=>match ? <mark key={n}>{text}</mark> : text)}
      </li>)}</ul>
    {busy && <p role="status">복사 중…</p>}
    {error && <p role="alert">{error}</p>}
  </main>;
}
