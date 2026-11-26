import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { LuCopy, LuRefreshCw } from "react-icons/lu";
import { Input } from "@gopass/ui/components/input";
import { passwordLength } from "@/shared/settings/passwordLength";
import { card, hint, icon } from "@/shared/ui/styles";

const toggles = [
  ["capitals", "대문자 (A-Z)"],
  ["numerals", "숫자 (0-9)"],
  ["symbols", "특수문자 (!@#$%^&*)"],
  ["ambiguous", "헷갈리는 문자 포함 (1, l, 0, O)"],
] as const;

/** Generates with `gopass pwgen`, so the result follows the same rules as the CLI. */
export function PasswordGenerator() {
  const [length, setLength] = useState(String(passwordLength()));
  const [options, setOptions] = useState({ capitals: true, numerals: true, symbols: false, ambiguous: true });
  const [value, setValue] = useState("");
  const [notice, setNotice] = useState("");
  const [round, setRound] = useState(0);
  const request = useRef(0);
  const size = Number(length);
  const valid = Number.isInteger(size) && size >= 6 && size <= 200;
  useEffect(() => {
    if (!valid) return;
    const current = ++request.current;
    setNotice("");
    invoke<string>("generate_password", { length: size, ...options })
      // A slower earlier call must not overwrite the newest result.
      .then(next => { if (request.current === current) setValue(next); })
      .catch(e => { if (request.current === current) { setValue(""); setNotice(String(e)); } });
  }, [size, valid, options, round]);

  return <div className="grid max-w-xl gap-4">
    <div className={card + " grid-cols-[1fr_auto_auto] items-center gap-1"}>
      <output aria-label="생성된 비밀번호" className="mr-2 min-h-6 font-mono text-lg break-all">{value}</output>
      <button aria-label="다시 생성" title="다시 생성" className={icon} disabled={!valid} onClick={() => setRound(round + 1)}><LuRefreshCw aria-hidden /></button>
      <button aria-label="복사" title="클립보드에 복사" className={icon} disabled={!value}
        onClick={() => navigator.clipboard.writeText(value).then(() => setNotice("복사했습니다."), e => setNotice(String(e)))}><LuCopy aria-hidden /></button>
    </div>
    <div className={card}>
      <label htmlFor="generator-length" className="text-sm font-medium">길이</label>
      <Input id="generator-length" type="number" min={6} max={200} aria-invalid={!valid} value={length} onChange={e => setLength(e.target.value)} />
      <p className={hint}>6~200 사이의 값을 입력하세요.</p>
    </div>
    <fieldset className={card}>
      <legend className="sr-only">포함할 문자</legend>
      <span className="text-sm font-medium">포함할 문자</span>
      {toggles.map(([key, label]) => <label key={key} className="flex items-center gap-2">
        <input type="checkbox" checked={options[key]} onChange={e => setOptions({ ...options, [key]: e.target.checked })} />{label}
      </label>)}
      <p className={hint}>소문자는 항상 들어갑니다.</p>
    </fieldset>
    {notice && <p role="status" className={hint}>{notice}</p>}
  </div>;
}
