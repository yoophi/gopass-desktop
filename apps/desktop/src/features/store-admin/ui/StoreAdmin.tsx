import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { Input } from "@gopass/ui/components/input";
import { refreshEntries } from "@/entities/entry";

export function StoreAdmin() {
  const [open,setOpen] = useState(false);
  const [name,setName] = useState("");
  const [directory,setDirectory] = useState("");
  const [busy,setBusy] = useState(false);
  const [status,setStatus] = useState("");
  const [diagnostics,setDiagnostics] = useState<[string,string][]>([]);
  const client = useQueryClient();
  const mounts = useQuery({queryKey:["mounts"],queryFn:()=>invoke<[string,string][]>("list_mounts"),enabled:open,retry:false});
  async function run(action:()=>Promise<void>) {
    setBusy(true);setStatus("");
    try {await action();} catch(e){setStatus(String(e));} finally {setBusy(false);}
  }
  async function change(command:string,args:Record<string,string>={}) {
    try { await invoke(command,args); }
    finally {
      // A multi-store sync can update one mount before another remote fails.
      await Promise.all([refreshEntries(client),client.invalidateQueries({queryKey:["mounts"]})]);
    }
    if(command==="add_mount"){setName("");setDirectory("");}
    setStatus(command==="sync_stores"?"동기화를 완료했습니다.":"마운트 목록을 갱신했습니다.");
  }
  return <details onToggle={e=>setOpen(e.currentTarget.open)} className="rounded border border-input p-3"><summary>저장소 관리</summary>
    <fieldset disabled={busy} className="mt-3 grid gap-3">
      {mounts.isError && <button onClick={()=>void mounts.refetch()}>마운트 조회 다시 시도</button>}
      {mounts.data && <ul>{mounts.data.map(([alias,path])=><li key={alias}>{alias} · {path}{" "}
        <button onClick={()=>run(()=>change("remove_mount",{name:alias}))}>연결 해제</button></li>)}</ul>}
      <label>마운트 이름<Input value={name} onChange={e=>setName(e.target.value)} /></label>
      <label>저장소 디렉터리<Input value={directory} onChange={e=>setDirectory(e.target.value)} /></label>
      <button disabled={!name || !directory} onClick={()=>run(()=>change("add_mount",{name,directory}))}>마운트 추가</button>
      <button onClick={()=>run(()=>change("sync_stores"))}>동기화</button>
      <button onClick={()=>run(async()=>{setDiagnostics([]);setDiagnostics(await invoke("diagnose"));})}>환경 진단</button>
    </fieldset>
    {busy && <p role="status">처리 중…</p>}
    {status && <p role="status">{status}</p>}
    <dl>{diagnostics.map(([stage,result])=><div key={stage}><dt>{stage}</dt><dd>{result}</dd></div>)}</dl>
  </details>;
}
