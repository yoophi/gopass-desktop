import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { LuShieldCheck } from "react-icons/lu";
import { card, heading, hint, plain, primary } from "@/shared/ui/styles";

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
  return <section className="grid max-w-xl gap-4">
    <div className={card}>
      <div className="flex items-center gap-3">
        <p className={"mr-auto " + hint}>경로 이름으로 고른 비밀번호 항목의 강도를 차례로 점검합니다.</p>
        {scanning ? <button className={plain + " shrink-0"} onClick={()=>{generation.current++;setScanning(false);setScan(undefined);}}>점검 취소</button>
          : <button className={primary + " shrink-0"} onClick={()=>void start()}>점검 시작</button>}
      </div>
      {scan && <div className="grid gap-1 border-t border-input pt-3">
        <p role="status" className={hint}>점검 {scan.checked} / {scan.total}</p>
        <progress className="h-2 w-full accent-ring" value={scan.checked} max={scan.total || 1} />
      </div>}
    </div>
    {scan && !scanning && <div className={card}>
      {scan.total===0 && <p className={hint}>점검할 비밀번호 항목이 없습니다.</p>}
      {average!==null && <p className={heading}><LuShieldCheck aria-hidden />평균 강도 {average}%</p>}
      {ratings.length>0 && <ul className="divide-y divide-input">{[...ratings].sort((a,b)=>a.score-b.score).map(({path,score})=><li key={path}>
        <button aria-label={path + " · " + score + "%"} className="flex w-full items-center gap-3 px-1 py-2 text-left hover:bg-input/30 focus-visible:outline-2" onClick={()=>open(path)}>
          <span className="mr-auto truncate">{path}</span>
          <span className={"shrink-0 rounded-full px-2 py-0.5 text-sm font-semibold " + (score<50 ? "bg-destructive/10 text-destructive" : "bg-ring/15 text-ring")}>{score}%</span>
        </button></li>)}</ul>}
      {scan.failed.length>0 && <p role="alert" className="text-sm text-destructive">조회 실패 · {scan.failed.join(", ")}</p>}
    </div>}
  </section>;
}
