import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { generatePassword, ratePassword } from "@gopass/entries";
import { Input } from "@gopass/ui/components/input";
import { copyEntry, entryHistory, readEntry, removeEntry, saveEntry } from "@/entities/entry";
import { passwordLength } from "@/shared/settings/passwordLength";

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
  const strength = ratePassword(value.split("\n")[0]);
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
    await client.invalidateQueries({queryKey:["entries"]});
    await client.invalidateQueries({queryKey:["history",name]});
    const channel = new BroadcastChannel("entries-changed");
    channel.postMessage("refresh"); channel.close();
  }
  return <section className="grid gap-3 rounded border border-input bg-white p-5">
    <header className="flex justify-between gap-2"><h2>{creating ? "새 항목" : path}</h2><button onClick={close}>닫기</button></header>
    <fieldset disabled={busy} className="grid gap-3">
      {creating && <label>항목 경로<Input value={name} onChange={e=>setName(e.target.value)} /></label>}
      {mode === "hidden" ? <div className="flex gap-3"><span>••••••••</span>
        <button onClick={()=>run(()=>reveal("shown"))}>표시</button>
        <button onClick={()=>run(()=>reveal("edit"))}>편집</button></div> :
        <><label>원문<textarea className="block w-full rounded border p-2" rows={5} readOnly={mode==="shown"} value={value} onChange={e=>setValue(e.target.value)} /></label>
          <p>비밀번호 강도 {strength.score}% · {strength.missing.join(", ") || "모든 기준 충족"}</p>
          {mode === "edit" && <div className="flex gap-3">
            <button onClick={()=>setValue(generatePassword(passwordLength()))}>비밀번호 생성</button>
            <button disabled={!name || !value} onClick={()=>run(async()=>{
              await saveEntry(name,value,!creating); conceal(); await refresh(); saved(name);
            })}>저장</button></div>}
          <button onClick={creating ? close : conceal}>{mode==="shown" ? "숨기기" : "편집 취소"}</button></>}
      {!creating && <div className="flex gap-3">
        <button onClick={()=>run(async()=>{await copyEntry(path);setNotice("복사했습니다.");})}>복사</button>
        <button onClick={()=>setConfirmDelete(true)}>삭제</button></div>}
      {confirmDelete && <div role="group" aria-label="삭제 확인"><p>{path} 항목을 삭제할까요?</p>
        <button onClick={()=>setConfirmDelete(false)}>취소</button>{" "}
        <button onClick={()=>run(async()=>{await removeEntry(path!);conceal();await refresh();close();})}>삭제 확인</button></div>}
    </fieldset>
    {notice && <p role="status">{notice}</p>}
    {!creating && <section><h3>변경 이력</h3>
      {history.isError ? <p>이력을 읽을 수 없습니다.</p> : <ul>{rows.slice(page*10,page*10+10).map(([author,time,message],i)=>
        <li key={i}>{time} · {author} · {message}</li>)}</ul>}
      {rows.length>10 && <div><button disabled={!page} onClick={()=>setPage(page-1)}>이전</button> {page+1} / {Math.ceil(rows.length/10)} <button disabled={(page+1)*10>=rows.length} onClick={()=>setPage(page+1)}>다음</button></div>}
    </section>}
  </section>;
}
