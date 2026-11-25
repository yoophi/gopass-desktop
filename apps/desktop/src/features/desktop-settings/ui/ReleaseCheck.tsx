import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import gt from "semver/functions/gt";
import valid from "semver/functions/valid";

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
  return <div className="grid gap-2">
    <p>설치 버전 {installed}</p>
    <button disabled={pending} onClick={()=>void check()}>새 버전 확인</button>
    {message && <p role="status">{message}</p>}
    {update && <button onClick={()=>invoke("open_releases").catch(e=>setMessage(String(e)))}>릴리스 페이지 열기</button>}
  </div>;
}
