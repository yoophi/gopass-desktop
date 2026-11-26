import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { LuChevronDown, LuChevronLeft, LuChevronRight, LuDatabase, LuHardDrive, LuKeyRound, LuList, LuPlus, LuSearch, LuSettings, LuShieldCheck, LuWrench } from "react-icons/lu";
import { entryListOptions } from "@/entities/entry";
import { EntryTree } from "@/features/browse-entries";
import { EntryEditor } from "@/features/manage-entry";
import { PasswordGenerator } from "@/features/generate-password";
import { PasswordHealth } from "@/features/password-health";
import { StoreAdmin } from "@/features/store-admin";
import { ExplorerPage } from "@/pages/explorer";
import { SettingsPage } from "@/pages/settings";
import { plain, primary } from "@/shared/ui/styles";
// Resized from gopass docs/logo.png (github.com/gopasspw/gopass).
import logo from "./gopass-logo.png";

type Page = "entries" | "generator" | "health" | "stores" | "settings";
const titles = { generator: "비밀번호 생성기", health: "비밀번호 점검", stores: "저장소 관리", settings: "설정" };
const group = "flex cursor-pointer list-none items-center gap-2 rounded-lg py-1.5 pr-2 pl-3 font-semibold hover:bg-white/10 [&::-webkit-details-marker]:hidden";
const chevron = "shrink-0 -rotate-90 transition-transform group-open:rotate-0";
const item = "flex w-full items-center gap-2 truncate rounded-lg py-1.5 pr-2 pl-[60px] text-left hover:bg-white/10 focus-visible:outline-2 aria-[current]:bg-black/40 aria-[current]:font-semibold";
const clampWidth = (width: number) => Math.min(480, Math.max(180, width));
const action = "flex items-center gap-1.5 " + plain;

// Native <dialog> supplies the focus trap, Esc to close and the backdrop.
function Modal({ close, children }: { close: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  // StrictMode reruns the effect on the same element, and showModal throws when already open.
  useEffect(() => { if (!ref.current!.open) ref.current!.showModal(); }, []);
  return <dialog ref={ref} onClose={close} onClick={e => { if (e.target === e.currentTarget) close(); }}
    className="m-auto max-h-[85vh] w-[min(36rem,calc(100vw-2rem))] overflow-y-auto rounded-xl text-inherit shadow-xl backdrop:bg-black/40">{children}</dialog>;
}

export function App() {
  const [page, setPage] = useState<Page>("entries");
  const [folder, setFolder] = useState("");
  // undefined: no entry open, null: creating a new one
  const [entry, setEntry] = useState<string | null | undefined>();
  const [menuError, setMenuError] = useState("");
  const [width, setWidth] = useState(240);
  const [collapsed, setCollapsed] = useState(false);
  const entries = useQuery(entryListOptions);
  const go = (next: Page, nextFolder = "") => { setPage(next); setFolder(nextFolder); setEntry(undefined); };
  const here = (target: Page, targetFolder = "") => (page === target && folder === targetFolder) || undefined;

  return (
    <div className="flex h-screen">
      <nav aria-label="주 메뉴" style={{ width: collapsed ? 48 : width }} className="flex shrink-0 flex-col bg-[#183329] text-white">
        {/* Hidden rather than unmounted so the folder tree keeps its expanded state. */}
        <div hidden={collapsed} className="min-h-0 flex-1 overflow-y-auto p-3 not-[[hidden]]:grid not-[[hidden]]:content-start not-[[hidden]]:gap-4">
        <p className="flex items-center gap-3 px-3 pt-2 text-lg font-semibold"><img src={logo} alt="" className="h-10 w-auto shrink-0" />gopass-desktop</p>
        <details open className="group grid gap-0.5">
          <summary className={group}><LuChevronDown aria-hidden className={chevron} /><LuDatabase aria-hidden className="shrink-0" />저장소</summary>
          <button className={item} aria-current={here("entries")} onClick={() => go("entries")}><LuList aria-hidden className="shrink-0" />전체 항목</button>
          {entries.data && <EntryTree key={JSON.stringify(entries.data)} paths={entries.data}
            current={page === "entries" ? folder : undefined} open={path => go("entries", path)} />}
        </details>
        <details open className="group grid gap-0.5">
          <summary className={group}><LuChevronDown aria-hidden className={chevron} /><LuWrench aria-hidden className="shrink-0" />도구</summary>
          <button className={item} aria-current={here("generator")} onClick={() => go("generator")}><LuKeyRound aria-hidden className="shrink-0" />비밀번호 생성기</button>
          <button className={item} aria-current={here("health")} onClick={() => go("health")}><LuShieldCheck aria-hidden className="shrink-0" />비밀번호 점검</button>
          <button className={item} aria-current={here("stores")} onClick={() => go("stores")}><LuHardDrive aria-hidden className="shrink-0" />저장소 관리</button>
        </details>
        </div>
        <button aria-label="사이드 메뉴 접기" aria-expanded={!collapsed} title={collapsed ? "사이드 메뉴 펼치기" : "사이드 메뉴 접기"}
          className="mt-auto flex h-12 shrink-0 items-center border-t border-white/15 px-4 hover:bg-white/10 focus-visible:outline-2 focus-visible:-outline-offset-2"
          onClick={() => setCollapsed(!collapsed)}>{collapsed ? <LuChevronRight aria-hidden /> : <LuChevronLeft aria-hidden />}</button>
      </nav>
      {/* The sidebar starts at x=0, so the pointer's x is the new width. */}
      {!collapsed && <div role="separator" aria-orientation="vertical" aria-label="사이드바 크기 조절" tabIndex={0}
        aria-valuenow={width} aria-valuemin={180} aria-valuemax={480}
        className="w-1.5 shrink-0 cursor-col-resize touch-none bg-[#183329] hover:bg-ring focus-visible:bg-ring focus-visible:outline-none"
        onPointerDown={e => { e.preventDefault(); e.currentTarget.focus(); e.currentTarget.setPointerCapture(e.pointerId); }}
        onPointerMove={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) setWidth(clampWidth(e.clientX)); }}
        onKeyDown={e => { if (e.key === "ArrowLeft") setWidth(clampWidth(width - 16)); if (e.key === "ArrowRight") setWidth(clampWidth(width + 16)); }} />}
      <main className="min-w-0 flex-1 overflow-y-auto p-8">
        <header className="mb-6 flex items-center gap-2">
          <h1 className="mr-auto truncate text-2xl font-semibold">
            {page === "entries" ? folder || "전체 항목" : titles[page]}
          </h1>
          <button className={"flex items-center gap-1.5 " + primary} onClick={() => setEntry(null)}><LuPlus aria-hidden />새 항목</button>
          <button className={action} onClick={() => invoke("open_search").catch(e => setMenuError(String(e)))}><LuSearch aria-hidden />빠른 검색</button>
          <button className={action} aria-current={here("settings")} onClick={() => go("settings")}><LuSettings aria-hidden />설정</button>
        </header>
        {menuError && <p role="alert" className="mb-4 text-destructive">{menuError}</p>}
        {page === "entries" && <ExplorerPage folder={folder} open={setEntry} />}
        {page === "generator" && <PasswordGenerator />}
        {page === "health" && <PasswordHealth paths={entries.data ?? []} open={setEntry} />}
        {page === "stores" && <StoreAdmin />}
        {page === "settings" && <SettingsPage />}
        {entry !== undefined && <Modal close={() => setEntry(undefined)}>
          <EntryEditor key={JSON.stringify(entry)} path={entry} close={() => setEntry(undefined)} saved={setEntry} />
        </Modal>}
      </main>
    </div>
  );
}
