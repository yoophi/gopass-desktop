import { test, expect } from "@playwright/test";

test.beforeEach(async ({context}) => {
  await context.addInitScript(() => {
    let disconnected = location.search === "?fixture=empty";
    if (disconnected) localStorage.setItem("fixture.entries","{}");
    const entries = () => JSON.parse(localStorage.getItem("fixture.entries") ?? '{"work/password":"dummy","work/secret":"Secure2026!"}');
    Object.assign(window, {__TAURI_INTERNALS__: {invoke: async (command:string, args: Record<string, any> = {}) => {
      const all = entries();
      switch (command) {
        case "list_entries":
          if (disconnected) { disconnected=false; throw new Error("disconnected fixture"); }
          return Object.keys(all);
        case "save_entry": all[args.path]=args.value;break;
        case "remove_entry": delete all[args.path];break;
        case "read_entry": return all[args.path];
        case "entry_history": return Array.from({length:12},(_,i)=>["author","date","change "+i]);
        case "generate_password": return "gen-"+args.length+(args.symbols?"-sym":"")+(args.ambiguous?"":"-clear");
        case "score_entry": return args.path.endsWith("password") ? 17 : 100;
        case "desktop_settings": return {version:"0.1.0",autostart:false,shortcut:"CommandOrControl+Shift+P"};
        case "pause_search_shortcut": sessionStorage.setItem("shortcutPaused",String(args.paused));return;
        case "open_releases": sessionStorage.setItem("releasesOpened","yes");return;
        case "close_search": sessionStorage.setItem("closed","yes");return;
        case "copy_entry":
          if (sessionStorage.getItem("failCopy")) throw Error("fixture failure");
          sessionStorage.setItem("copiedPath",args.path);return;
        default: throw Error("Unexpected command "+command);
      }
      localStorage.setItem("fixture.entries",JSON.stringify(all));
    }}});
  });
});

test("edit lifecycle, strength, history and cross-window cache refresh",async({page,context})=>{
  await page.goto("/");
  const quick=await context.newPage();await quick.goto("/?view=search");await page.bringToFront();
  await page.getByText("설정",{exact:true}).click();
  const length=page.getByLabel("생성할 비밀번호 길이");await expect(length).toHaveValue("50");
  await length.fill("12");await page.getByRole("button",{name:"길이 저장"}).click();
  await page.getByRole("button",{name:"새 항목"}).click();
  await page.getByLabel("항목 경로").fill("demo");
  const raw=page.getByLabel("비밀번호",{exact:true});const extra=page.getByLabel("추가 정보",{exact:true});const shown=page.getByLabel("비밀번호 값");
  await page.getByRole("button",{name:"비밀번호 생성",exact:true}).click();const generated=await raw.inputValue();expect(generated).toHaveLength(12);
  await page.getByRole("button",{name:"비밀번호 생성",exact:true}).click();expect(await raw.inputValue()).not.toEqual(generated);
  await raw.fill("Secure2026!");await extra.fill("line two\n");await expect(page.getByText(/강도 100%/)).toBeVisible();
  await page.getByRole("button",{name:"저장",exact:true}).click();await expect(page.getByRole("heading",{name:"demo"})).toBeVisible();
  await expect(quick.getByRole("option",{name:"demo"})).toBeVisible();await expect(raw).toHaveCount(0);
  await page.getByRole("button",{name:"복사",exact:true}).click();await expect(raw).toHaveCount(0);
  await page.getByText("편집",{exact:true}).click();await expect(raw).toHaveValue("Secure2026!");await expect(extra).toContainText("line two");
  await raw.fill("discard");await page.getByText("편집 취소").click();await page.getByRole("button",{name:"표시",exact:true}).click();
  await expect(shown).toHaveText("Secure2026!");await expect(page.getByText("line two")).toBeVisible();await page.getByRole("button",{name:"숨기기",exact:true}).click();
  await page.getByText("편집",{exact:true}).click();await raw.fill("kept");await extra.fill("new line\n");
  await page.getByRole("button",{name:"저장",exact:true}).click();await page.getByRole("button",{name:"표시",exact:true}).click();await expect(shown).toHaveText("kept");await expect(page.getByText("new line")).toBeVisible();
  await page.getByRole("button",{name:"편집",exact:true}).click();await page.getByRole("button",{name:"비밀번호 생성",exact:true}).click();
  expect(await raw.inputValue()).toHaveLength(12);await expect(extra).toContainText("new line");await page.getByText("편집 취소").click();await page.getByRole("button",{name:"표시",exact:true}).click();
  await page.evaluate(()=>window.dispatchEvent(new Event("pagehide")));await expect(shown).toHaveCount(0);
  await page.getByRole("button",{name:"다음"}).click();await expect(page.getByText("date · author · change 11")).toBeVisible();
  await page.getByRole("button",{name:"삭제",exact:true}).click();await page.getByText("취소",{exact:true}).click();
  await page.getByRole("button",{name:"삭제",exact:true}).click();await page.getByText("삭제 확인",{exact:true}).click();
  await expect(quick.getByRole("option",{name:"demo"})).toHaveCount(0);
});

test("quick search respects IME composition and retries clipboard failures",async({page})=>{
  await page.goto("/?view=search");const input=page.getByRole("combobox");
  await input.fill("WORK S");await expect(page.locator("mark")).toHaveCount(5);
  await input.press("Tab");await input.press("Shift+Tab");await input.press("ArrowDown");
  await input.dispatchEvent("compositionstart");await input.press("Enter");await input.dispatchEvent("compositionend");
  expect(await page.evaluate(()=>sessionStorage.getItem("copiedPath"))).toBeNull();
  await page.evaluate(()=>sessionStorage.setItem("failCopy","true"));await input.press("Enter");await expect(page.getByRole("alert")).toBeVisible();
  expect(await page.evaluate(()=>sessionStorage.getItem("closed"))).toBeNull();
  await page.evaluate(()=>sessionStorage.removeItem("failCopy"));await page.getByRole("option").nth(1).click();
  await expect.poll(()=>page.evaluate(()=>sessionStorage.getItem("copiedPath"))).toEqual("work/secret");
  await expect.poll(()=>page.evaluate(()=>sessionStorage.getItem("closed"))).toEqual("yes");
});

test("open a weak entry from a completed health scan and check a newer release",async({page})=>{
  await page.goto("/");await page.getByText("비밀번호 점검",{exact:true}).click();
  await page.getByText("점검 시작").click();await expect(page.getByText("점검 2 / 2")).toBeVisible();await expect(page.getByText("평균 강도 59%")).toBeVisible();
  await page.getByRole("button",{name:"work/password · 17%"}).click();await expect(page.getByRole("dialog").getByRole("heading",{name:"work/password"})).toBeVisible();
  await page.keyboard.press("Escape");await expect(page.getByRole("dialog")).toHaveCount(0);await expect(page.getByText("평균 강도 59%")).toBeVisible();
  await page.route("https://api.github.com/repos/yoophi/gopass-desktop/releases/latest",route=>route.fulfill({json:{tag_name:"v0.2.0"}}));
  await page.getByText("설정",{exact:true}).click();await page.getByText("새 버전 확인").click();
  await expect(page.getByText("새 릴리스 v0.2.0")).toBeVisible();await page.getByText("릴리스 페이지 열기").click();
  await expect.poll(()=>page.evaluate(()=>sessionStorage.getItem("releasesOpened"))).toEqual("yes");
  const shortcut=page.getByLabel("전역 검색 단축키");await expect(shortcut).toHaveValue("CommandOrControl+Shift+P");
  await shortcut.press("k");await shortcut.press("Shift");await expect(shortcut).toHaveValue("CommandOrControl+Shift+P");
  await expect.poll(()=>page.evaluate(()=>sessionStorage.getItem("shortcutPaused"))).toEqual("true");
  await shortcut.press("Control+Alt+Digit7");await expect(shortcut).toHaveValue("Control+Alt+7");
  await shortcut.press("Meta+Shift+KeyK");await expect(shortcut).toHaveValue("Command+Shift+K");
  await shortcut.press("F9");await expect(shortcut).toHaveValue("F9");
  await page.getByRole("button",{name:"단축키 지우기"}).click();await expect(shortcut).toHaveValue("");await expect(shortcut).toBeFocused();
  await expect(page.getByRole("button",{name:"단축키 저장"})).toBeDisabled();
  await shortcut.press("Tab");await expect.poll(()=>page.evaluate(()=>sessionStorage.getItem("shortcutPaused"))).toEqual("false");
});

test("generate a password with gopass options and copy it",async({page,context})=>{
  await context.grantPermissions(["clipboard-read","clipboard-write"]);
  await page.goto("/");await page.getByRole("button",{name:"비밀번호 생성기"}).click();
  const result=page.getByLabel("생성된 비밀번호");await expect(result).toHaveText("gen-50");
  await page.getByLabel(/특수문자/).check();await page.getByLabel(/헷갈리는 문자/).uncheck();await expect(result).toHaveText("gen-50-sym-clear");
  await page.getByLabel("길이").fill("3");await expect(page.getByRole("button",{name:"다시 생성"})).toBeDisabled();
  await page.getByLabel("길이").fill("20");await expect(result).toHaveText("gen-20-sym-clear");
  await page.getByRole("button",{name:"복사",exact:true}).click();await expect(page.getByText("복사했습니다.")).toBeVisible();
  expect(await page.evaluate(()=>navigator.clipboard.readText())).toEqual("gen-20-sym-clear");
});

test("show extra lines as JSON, YAML, Markdown or plain text",async({page})=>{
  await page.goto("/");
  await page.evaluate(()=>localStorage.setItem("fixture.entries",JSON.stringify({
    "fmt/json":'pw\n{"a":"x, y","big":12345678901234567890,"list":[ ],"in":{"k":[1,2]}}',
    "fmt/yaml":"pw\nuser: demo\nurl: https://example.com/a",
    "fmt/nested":"pw\nserver:\n  host: example.com\n  ports:\n  - 22",
    "fmt/md":"pw\n# Title\n\n- one\n- **two**\n\n[site](https://example.com) ![x](https://example.com/x.png)",
    "fmt/text":"pw\njust a note\nsee http://example.com/x: y"})));
  await page.reload();const dialog=page.getByRole("dialog");
  const show=async(name:string)=>{await page.keyboard.press("Escape");await page.getByRole("button",{name}).click();await dialog.getByRole("button",{name:"표시"}).click();};
  await show("fmt/json");await expect(dialog.getByText("· JSON")).toBeVisible();
  await expect(dialog.locator("pre")).toHaveText('{\n  "a": "x, y",\n  "big": 12345678901234567890,\n  "list": [],\n  "in": {\n    "k": [\n      1,\n      2\n    ]\n  }\n}');
  await show("fmt/yaml");await expect(dialog.getByRole("term")).toHaveText(["user","url"]);await expect(dialog.getByRole("definition")).toHaveText(["demo","https://example.com/a"]);
  await show("fmt/nested");await expect(dialog.getByText("· YAML")).toBeVisible();await expect(dialog.locator("pre")).toContainText("  host: example.com");
  await show("fmt/md");await expect(dialog.getByRole("heading",{name:"Title"})).toBeVisible();await expect(dialog.locator("ul.list-disc li, [class*=list-disc] li")).toHaveText(["one","two"]);
  await expect(dialog.locator("strong")).toHaveText("two");await expect(dialog.locator("img,a")).toHaveCount(0);await expect(dialog.getByText("site")).toBeVisible();
  await show("fmt/text");await expect(dialog.getByText("· 텍스트")).toBeVisible();await expect(dialog.getByText("just a note")).toBeVisible();
});

test("open a folder from the sidebar tree, filter its list, and enter an entry", async ({page}) => {
  await page.goto("/");
  await expect(page.getByRole("button", {name:"work/password"})).toBeVisible();
  const folder = page.getByRole("treeitem", {name:"work", exact:true});
  await folder.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", {name:"work", exact:true})).toBeVisible();
  const filter = page.getByRole("searchbox");
  await filter.fill("missing");
  await expect(page.getByText("검색 결과가 없습니다.")).toBeVisible();
  await filter.press("Escape");
  await page.getByRole("button", {name:"work/password"}).click();
  await expect(page.getByRole("heading", {name:"work/password"})).toBeVisible();
  await page.getByRole("button", {name:"닫기"}).click();
  await expect(page.getByRole("button", {name:"work/secret"})).toBeVisible();
  const splitter = page.getByRole("separator");
  await splitter.hover();await page.mouse.down();await page.mouse.move(320, 200);await page.mouse.up();
  await expect(splitter).toHaveAttribute("aria-valuenow", "320");
  await page.mouse.move(600, 200);await splitter.press("ArrowLeft");
  await expect(splitter).toHaveAttribute("aria-valuenow", "304");
  await expect.poll(async () => (await page.getByRole("navigation").boundingBox())?.width).toBe(304);
  const toggle = page.getByRole("button", {name:"사이드 메뉴 접기"});
  await toggle.click();await expect(folder).toBeHidden();await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();await expect(folder).toBeVisible();
  await expect.poll(async () => (await page.getByRole("navigation").boundingBox())?.width).toBe(304);
});

test("distinguish a failed listing from an empty store and create its first entry", async ({page}) => {
  await page.goto("/?fixture=empty");
  await page.getByRole("button",{name:"다시 시도"}).click();
  await expect(page.getByText("저장소가 비어 있습니다.")).toBeVisible();
  await page.getByRole("button",{name:"새 항목"}).click();
  await page.getByLabel("항목 경로").fill("first");
  await page.getByLabel("비밀번호",{exact:true}).fill("fixture");
  await page.getByRole("button",{name:"저장",exact:true}).click();
  await page.getByRole("button",{name:"닫기"}).click();
  await expect(page.getByRole("button",{name:"first"})).toBeVisible();
});
