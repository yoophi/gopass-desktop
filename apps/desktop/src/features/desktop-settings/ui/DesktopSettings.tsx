import { ReleaseCheck } from "./ReleaseCheck";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { LuX } from "react-icons/lu";
import { invoke } from "@tauri-apps/api/core";
import { Input } from "@gopass/ui/components/input";
import { passwordLength } from "@/shared/settings/passwordLength";
import { card, hint, primary } from "@/shared/ui/styles";

interface Settings { shortcut: string; error: string | null; autostart: boolean | null; version: string }

/** Turns a key press into a Tauri accelerator such as "Command+Shift+P"; null when it cannot be one. */
function accelerator(event: KeyboardEvent) {
  if (/^(Shift|Control|Alt|Meta|OS)/.test(event.code)) return null;
  const modifiers = [event.metaKey && "Command", event.ctrlKey && "Control", event.altKey && "Alt", event.shiftKey && "Shift"].filter(Boolean);
  // A bare letter as a global shortcut would swallow that key in every app.
  if (!modifiers.length && !/^F\d+$/.test(event.code)) return null;
  return [...modifiers, event.code.replace(/^(Key|Digit)/, "")].join("+");
}

export function DesktopSettings() {
  const [settings, setSettings] = useState<Settings>();
  const [shortcut,setShortcut] = useState("");
  const [length,setLength] = useState(String(passwordLength()));
  const [message,setMessage] = useState("");
  const shortcutInput = useRef<HTMLInputElement>(null);
  async function reload() {
    const result = await invoke<Settings>("desktop_settings");
    setSettings(result); setShortcut(result.shortcut);
  }
  useEffect(()=>{void reload().catch(e=>setMessage(String(e)));},[]);
  // The registered shortcut never reaches the page, so it is released while the field has focus.
  const pause = (paused:boolean) => invoke("pause_search_shortcut",{paused}).catch(e=>setMessage(String(e)));
  useEffect(()=>()=>{void invoke("pause_search_shortcut",{paused:false}).catch(()=>{});},[]);
  async function run(action:()=>Promise<void>) {
    try {setMessage("");await action();await reload();setMessage("저장했습니다.");}
    catch(e){setMessage(String(e));}
  }
  return <div className="grid max-w-xl gap-4">
      <div className={card}>
        <label htmlFor="password-length" className="text-sm font-medium">생성할 비밀번호 길이</label>
        <div className="flex gap-2">
          <Input id="password-length" type="number" min={6} max={200} value={length} onChange={e=>setLength(e.target.value)} />
          <button aria-label="길이 저장" className={primary + " shrink-0"} onClick={()=>{const n=Number(length);if(!Number.isInteger(n)||n<6||n>200){setMessage("6~200자를 입력하세요.");return;}
            localStorage.setItem("passwordLength",String(n));setMessage("저장했습니다.");}}>저장</button>
        </div>
        <p className={hint}>새 항목과 편집 화면의 비밀번호 생성에 적용됩니다. 6~200자.</p>
      </div>
      <div className={card}>
        <label htmlFor="search-shortcut" className="text-sm font-medium">전역 검색 단축키</label>
        <div className="flex gap-2"><div className="relative min-w-0 flex-1">
          {/* Tab stays free so keyboard users can leave the field. */}
          <Input id="search-shortcut" ref={shortcutInput} readOnly className="pr-9" placeholder="여기에서 단축키를 누르세요" value={shortcut}
            onFocus={()=>void pause(true)} onBlur={()=>void pause(false)}
            onKeyDown={e=>{if(e.key==="Tab")return;e.preventDefault();const next=accelerator(e);if(next)setShortcut(next);}} />
          {shortcut && <button aria-label="단축키 지우기" title="지우기" className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-input/40"
            onClick={()=>{setShortcut("");shortcutInput.current?.focus();}}><LuX aria-hidden /></button>}
        </div>
          <button aria-label="단축키 저장" className={primary + " shrink-0"} disabled={!shortcut} onClick={()=>run(()=>invoke("set_search_shortcut",{value:shortcut}))}>저장</button>
        </div>
        {settings?.error && <p role="alert" className="text-sm text-destructive">단축키 등록 실패 · {settings.error}. 메뉴에서 빠른 검색을 열 수 있습니다.</p>}
      </div>
      {settings && <label className={card + " grid-cols-[auto_1fr] items-center"}><input type="checkbox" checked={settings.autostart===true} disabled={settings.autostart===null}
        onChange={e=>void run(()=>invoke("set_autostart",{enabled:e.target.checked}))} />로그인 시 자동 시작</label>}
      {settings && <ReleaseCheck installed={settings.version} />}
      {message && <p role="status" className={hint}>{message}</p>}
  </div>;
}
