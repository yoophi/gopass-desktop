import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import gt from "semver/functions/gt";
import valid from "semver/functions/valid";
import { card, hint, plain } from "@/shared/ui/styles";


export function ReleaseCheck({installed}:{installed:string}) {
  const [message,setMessage] = useState("");
  const [update,setUpdate] = useState(false);
  const [pending,setPending] = useState(false);
  async function check() {
    setPending(true);setUpdate(false);
    try {
      const response=await fetch("https://api.github.com/repos/yoophi/gopass-desktop/releases/latest");
      if(response.status===404){setMessage("게시된 릴리스가 없습니다.");return;}
      if(!response.ok)throw Error("릴리스를 조회할 수 없습니다.");
      const release=await response.json();
      if(!valid(release.tag_name))throw Error("릴리스 버전을 확인할 수 없습니다.");
      const newer=gt(release.tag_name,installed);
      setUpdate(newer);setMessage(newer ? "새 릴리스 "+release.tag_name : "최신 버전입니다.");
    } catch(e){setMessage(String(e));}
    finally{setPending(false);}
  }
  return <div className={card}>
    <div className="flex items-center gap-2">
      <p className="mr-auto"><span className={"block "+hint}>설치 버전</span><span className="font-semibold">{installed}</span></p>
      <button className={plain} disabled={pending} onClick={()=>void check()}>새 버전 확인</button>
    </div>
    {message && <div className="flex items-center gap-2 border-t border-input pt-3">
      <p role="status" className="mr-auto">{message}</p>
      {update && <button className={plain} onClick={()=>invoke("open_releases").catch(e=>setMessage(String(e)))}>릴리스 페이지 열기</button>}
    </div>}
  </div>;
}
