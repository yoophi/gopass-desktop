import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { generatePassword, ratePassword } from "@gopass/entries";
import { LuCopy, LuEye, LuKeyRound, LuEyeOff, LuTrash2, LuTriangleAlert, LuX } from "react-icons/lu";
import { Input } from "@gopass/ui/components/input";
import { refreshEntries, copyEntry, entryHistory, readEntry, removeEntry, saveEntry } from "@/entities/entry";
import { passwordLength } from "@/shared/settings/passwordLength";
import { field, hint, icon, plain, primary } from "@/shared/ui/styles";
import { EntryDetails } from "./EntryDetails";


const DetailsEditor = lazy(() => import("./DetailsEditor"));

export function EntryEditor({ path, close, saved }: {
  path: string | null; close: () => void; saved: (path: string) => void;
}) {
  const creating = path === null;
  const [name, setName] = useState(path ?? "");
  const [mode, setMode] = useState<"hidden" | "shown" | "edit">(creating ? "edit" : "hidden");
  const [value, setValue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(0);
  const revision = useRef(0);
  const client = useQueryClient();
  const history = useQuery({queryKey:["history",path],queryFn:()=>entryHistory(path!),enabled:!creating,retry:false});
  const rows = history.data ?? [];
  // gopass keeps the password on the first line; everything after it is free-form.
  const split = value.indexOf("\n");
  const password = split < 0 ? value : value.slice(0, split);
  const extra = split < 0 ? "" : value.slice(split + 1);
  const details = extra.trim();
  const compose = (first: string, others: string) => setValue(others ? first + "\n" + others : first);
  const strength = ratePassword(password);
  function conceal() {
    revision.current++;
    setValue("");
    setMode(creating ? "edit" : "hidden");
  }
  useEffect(() => {
    function hidden() { if (document.hidden) conceal(); }
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("pagehide", conceal);
    return () => {
      revision.current++;
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("pagehide", conceal);
    };
  }, [creating]);

  async function run(work: () => Promise<void>) {
    setBusy(true); setNotice("");
    try { await work(); } catch (error) { setNotice(String(error)); }
    finally { setBusy(false); }
  }
  async function reveal(next: "edit" | "shown") {
    const request = ++revision.current;
    const text = await readEntry(path!);
    if (revision.current === request && !document.hidden) { setValue(text); setMode(next); }
  }
  async function refresh() {
    await refreshEntries(client);
    await client.invalidateQueries({queryKey:["history",name]});

  }
  return <section className="grid gap-3 bg-white p-6">
    <header className="flex items-center justify-between gap-2"><h2 className="text-xl font-semibold">{creating ? "새 항목" : "View item"}</h2>
      <button aria-label="닫기" className="rounded p-1 hover:bg-input/40" onClick={close}><LuX aria-hidden /></button></header>
    {!creating && <div className="flex items-center gap-3 rounded-lg border border-input p-4">
      <LuKeyRound aria-hidden className="shrink-0 text-muted-foreground" /><h3 className="text-lg font-semibold break-all">{path}</h3></div>}
    <fieldset disabled={busy} className="grid gap-3">
      {creating && <label className={field}>항목 경로<Input value={name} onChange={e=>setName(e.target.value)} /></label>}
      <div className="grid gap-2 rounded-lg border border-input p-4">
        <div className="flex items-center gap-1">
          <span className="mr-auto text-sm font-medium">비밀번호</span>
          {mode === "hidden" && <button aria-label="표시" title="표시" className={icon} onClick={()=>run(()=>reveal("shown"))}><LuEye aria-hidden /></button>}
          {mode === "shown" && <button aria-label="숨기기" title="숨기기" className={icon} onClick={conceal}><LuEyeOff aria-hidden /></button>}
          {!creating && <button aria-label="복사" title="클립보드에 복사" className={icon}
            onClick={()=>run(async()=>{await copyEntry(path);setNotice("복사했습니다.");})}><LuCopy aria-hidden /></button>}
        </div>
        {mode === "hidden" && <span aria-label="가려진 값" className="tracking-widest">••••••••</span>}
        {mode === "shown" && <span aria-label="비밀번호 값" className="font-mono break-all">{password}</span>}
        {mode === "edit" && <Input aria-label="비밀번호" className="font-mono" autoComplete="off" spellCheck={false} value={password} onChange={e=>compose(e.target.value, extra)} />}
        {mode !== "hidden" && <p className={hint}>비밀번호 강도 {strength.score}% · {strength.missing.join(", ") || "모든 기준 충족"}</p>}
      </div>
      {mode === "shown" && details && <EntryDetails text={details} />}
      {mode === "edit" && <div className="grid gap-2 rounded-lg border border-input p-4">
        <span className="text-sm font-medium">추가 정보</span>
        <Suspense fallback={<p className={hint}>편집기를 불러오는 중입니다.</p>}><DetailsEditor value={extra} onChange={next=>compose(password, next)} /></Suspense>
        <p className={hint}>사용자 이름, 주소, 메모처럼 비밀번호와 함께 저장할 내용입니다. JSON, YAML, Markdown은 문법을 강조합니다.</p></div>}
    </fieldset>
    {notice && <p role="status" className={hint}>{notice}</p>}
    {!creating && <section className="grid gap-2 rounded-lg border border-input p-4">
      <h3 className="text-sm font-medium">변경 이력</h3>
      {history.isError ? <p className={hint}>이력을 읽을 수 없습니다.</p> : !rows.length ? <p className={hint}>{history.isPending ? "이력을 불러오는 중입니다." : "기록된 이력이 없습니다."}</p> : <ul className="overflow-x-auto rounded-md bg-[#0f1f19] p-3 font-mono text-xs leading-relaxed text-emerald-50">{rows.slice(page*10,page*10+10).map(([author,time,message],i)=>
        <li key={i} className="whitespace-pre"><span className="text-emerald-400">{time}</span> · <span className="text-sky-300">{author}</span> · {message}</li>)}</ul>}
      {rows.length>10 && <div className={"flex items-center gap-2 "+hint}><button className={plain} disabled={!page} onClick={()=>setPage(page-1)}>이전</button> {page+1} / {Math.ceil(rows.length/10)} <button className={plain} disabled={(page+1)*10>=rows.length} onClick={()=>setPage(page+1)}>다음</button></div>}
    </section>}
    <fieldset disabled={busy} className="sticky bottom-0 -mx-6 -mb-6 grid gap-2 border-t border-input bg-white px-6 py-4">
      {mode === "edit" && <div className="flex gap-2">
        <button className={primary} disabled={!name || !value} onClick={()=>run(async()=>{
          await saveEntry(name,value,!creating); conceal(); await refresh(); saved(name);
        })}>저장</button>
        <button className={plain} onClick={()=>compose(generatePassword(passwordLength()), extra)}>비밀번호 생성</button>
        <button className={plain} onClick={creating ? close : conceal}>편집 취소</button></div>}
      {!creating && mode !== "edit" && !confirmDelete && <div className="flex items-center justify-between">
        <button className={primary} onClick={()=>run(()=>reveal("edit"))}>편집</button>
        <button aria-label="삭제" title="삭제" className={icon + " text-destructive"} onClick={()=>setConfirmDelete(true)}><LuTrash2 aria-hidden /></button></div>}
      {confirmDelete && <div role="group" aria-label="삭제 확인" className="grid gap-3 rounded-lg bg-destructive/10 p-3">
        <p className="flex items-start gap-2 text-sm text-destructive"><LuTriangleAlert aria-hidden className="mt-0.5 shrink-0" />
          <span><strong className="break-all">{path}</strong> 항목을 삭제할까요?</span></p>
        <div className="flex justify-end gap-2">
          <button autoFocus className={plain + " whitespace-nowrap"} onClick={()=>setConfirmDelete(false)}>취소</button>
          <button className="rounded-lg bg-destructive px-3 py-1.5 text-sm font-medium whitespace-nowrap text-white hover:bg-destructive/90 disabled:opacity-50"
            onClick={()=>run(async()=>{await removeEntry(path!);conceal();await refresh();close();})}>삭제 확인</button>
        </div></div>}
    </fieldset>
  </section>;
}
