import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface Rating { path: string; score: number }
interface Scan { total: number; checked: number; ratings: Rating[]; failed: string[] }

export function PasswordHealth({paths, open}: {paths: readonly string[]; open: (path: string)=>void}) {
  const [scan,setScan] = useState<Scan>();
  const [scanning,setScanning] = useState(false);
  const generation = useRef(0);
  useEffect(()=>()=>{generation.current++;},[]);
  async function start() {
    const token=++generation.current;
    const passwords=paths.filter(path=>/(password|pw|pass|secret|key$|certificate)/i.test(path));
    const result: Scan = {total:passwords.length,checked:0,ratings:[],failed:[]};
    setScan({...result});setScanning(true);
    for (const path of passwords) {
      try {
        const score=await invoke<number>("score_entry",{path});
        result.ratings.push({path,score});
      } catch {result.failed.push(path);}
      if (generation.current !== token) return;
      result.checked++;
      setScan({...result,ratings:[...result.ratings],failed:[...result.failed]});
    }
    setScanning(false);
  }
  const ratings=scan?.ratings ?? [];
  const average=ratings.length ? Math.round(ratings.reduce((sum,r)=>sum+r.score,0)/ratings.length) : null;
  return <details className="rounded border border-input p-3"><summary>비밀번호 점검</summary>
    <button disabled={scanning} onClick={()=>void start()}>점검 시작</button>
    {scan && <p role="status">점검 {scan.checked} / {scan.total}</p>}
    {scanning && <button onClick={()=>{generation.current++;setScanning(false);setScan(undefined);}}>점검 취소</button>}
    {scan && !scanning && <>
      {scan.total===0 && <p>점검할 비밀번호 항목이 없습니다.</p>}
      {average!==null && <p>평균 강도 {average}%</p>}
      <ul>{[...ratings].sort((a,b)=>a.score-b.score).map(({path,score})=><li key={path}>
        <button onClick={()=>open(path)}>{path} · {score}%</button></li>)}</ul>
      {scan.failed.length>0 && <p role="alert">조회 실패 · {scan.failed.join(", ")}</p>}
    </>}
  </details>;
}
