import { ReleaseCheck } from "./ReleaseCheck";
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Input } from "@gopass/ui/components/input";
import { passwordLength } from "@/shared/settings/passwordLength";

interface Settings { shortcut: string; error: string | null; autostart: boolean | null; version: string }

export function DesktopSettings() {
  const [settings, setSettings] = useState<Settings>();
  const [shortcut,setShortcut] = useState("");
  const [length,setLength] = useState(String(passwordLength()));
  const [message,setMessage] = useState("");
  async function reload() {
    const result = await invoke<Settings>("desktop_settings");
    setSettings(result); setShortcut(result.shortcut);
  }
  useEffect(()=>{void reload().catch(e=>setMessage(String(e)));},[]);
  async function run(action:()=>Promise<void>) {
    try {setMessage("");await action();await reload();setMessage("저장했습니다.");}
    catch(e){setMessage(String(e));}
  }
  return <details className="rounded border border-input p-3"><summary>설정</summary>
    <div className="mt-3 grid gap-3">
      <label>생성할 비밀번호 길이<Input type="number" min={6} max={200} value={length} onChange={e=>setLength(e.target.value)} /></label>
      <button onClick={()=>{const n=Number(length);if(!Number.isInteger(n)||n<6||n>200){setMessage("6~200자를 입력하세요.");return;}
        localStorage.setItem("passwordLength",String(n));setMessage("저장했습니다.");}}>길이 저장</button>
      <label>전역 검색 단축키<Input value={shortcut} onChange={e=>setShortcut(e.target.value)} /></label>
      <button onClick={()=>run(()=>invoke("set_search_shortcut",{value:shortcut}))}>단축키 저장</button>
      {settings?.error && <p role="alert">단축키 등록 실패 · {settings.error}. 메뉴에서 빠른 검색을 열 수 있습니다.</p>}
      {settings && <label><input type="checkbox" checked={settings.autostart===true} disabled={settings.autostart===null}
        onChange={e=>void run(()=>invoke("set_autostart",{enabled:e.target.checked}))} /> 로그인 시 자동 시작</label>}
      {settings && <ReleaseCheck installed={settings.version} />}
      {message && <p role="status">{message}</p>}
    </div>
  </details>;
}
