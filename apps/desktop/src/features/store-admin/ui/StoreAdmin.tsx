import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { LuHardDrive, LuPlus, LuRefreshCw } from "react-icons/lu";
import { Input } from "@gopass/ui/components/input";
import { refreshEntries } from "@/entities/entry";
import { card, field, heading, hint, plain, primary } from "@/shared/ui/styles";


export function StoreAdmin() {
  const [name,setName] = useState("");
  const [directory,setDirectory] = useState("");
  const [busy,setBusy] = useState(false);
  const [status,setStatus] = useState("");
  const [diagnostics,setDiagnostics] = useState<[string,string][]>([]);
  const client = useQueryClient();
  const mounts = useQuery({queryKey:["mounts"],queryFn:()=>invoke<[string,string][]>("list_mounts"),retry:false});
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
  return <section className="grid max-w-xl gap-4">
    <fieldset disabled={busy} className="grid gap-4">
      <div className={card}>
        <h2 className={heading}><LuHardDrive aria-hidden />마운트</h2>
        {mounts.isPending && <p role="status" className={hint}>마운트를 불러오는 중입니다.</p>}
        {mounts.isError && <div className="flex items-center gap-2"><p className="mr-auto text-destructive">마운트를 읽을 수 없습니다.</p>
          <button className={plain} onClick={()=>void mounts.refetch()}>마운트 조회 다시 시도</button></div>}
        {mounts.data?.length===0 && <p className={hint}>연결된 마운트가 없습니다.</p>}
        {mounts.data && mounts.data.length>0 && <ul className="divide-y divide-input">{mounts.data.map(([alias,path])=>
          <li key={alias} className="flex items-center gap-3 py-2">
            <span className="grid min-w-0 flex-1"><span className="truncate font-semibold">{alias}</span>
              <span className={"truncate "+hint} title={path}>{path}</span></span>
            <button className={plain+" shrink-0 text-destructive"} onClick={()=>run(()=>change("remove_mount",{name:alias}))}>연결 해제</button>
          </li>)}</ul>}
      </div>
      <div className={card}>
        <h2 className={heading}><LuPlus aria-hidden />마운트 추가</h2>
        <label className={field}>마운트 이름<Input value={name} onChange={e=>setName(e.target.value)} /></label>
        <label className={field}>저장소 디렉터리<Input value={directory} onChange={e=>setDirectory(e.target.value)} /></label>
        <button className={primary+" justify-self-start"} disabled={!name || !directory} onClick={()=>run(()=>change("add_mount",{name,directory}))}>마운트 추가</button>
      </div>
      <div className={card}>
        <h2 className={heading}><LuRefreshCw aria-hidden />동기화와 진단</h2>
        <div className="flex items-center gap-3"><p className={"mr-auto "+hint}>모든 저장소를 원격과 맞춥니다.</p>
          <button className={plain+" shrink-0"} onClick={()=>run(()=>change("sync_stores"))}>동기화</button></div>
        <div className="flex items-center gap-3 border-t border-input pt-3"><p className={"mr-auto "+hint}>CLI 실행, 저장소 접근, GPG 복호화를 차례로 확인합니다.</p>
          <button className={plain+" shrink-0"} onClick={()=>run(async()=>{setDiagnostics([]);setDiagnostics(await invoke("diagnose"));})}>환경 진단</button></div>
        {diagnostics.length>0 && <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-t border-input pt-3 text-sm">{diagnostics.map(([stage,result])=>
          <div key={stage} className="contents"><dt className="font-medium">{stage}</dt><dd className="break-words text-muted-foreground">{result}</dd></div>)}</dl>}
      </div>
    </fieldset>
    {busy && <p role="status" className={hint}>처리 중…</p>}
    {status && <p role="status" className={hint}>{status}</p>}
  </section>;
}
