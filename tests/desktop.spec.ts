import { test, expect } from "@playwright/test";

test.beforeEach(async ({context}) => {
  await context.addInitScript(() => {
    const entries = () => JSON.parse(localStorage.getItem("fixture.entries") ?? '{"work/password":"dummy","work/secret":"Secure2026!"}');
    Object.assign(window, {__TAURI_INTERNALS__: {invoke: async (command:string, args: Record<string, any> = {}) => {
      const all = entries();
      switch (command) {
        case "list_entries": return Object.keys(all);
        case "save_entry": all[args.path]=args.value;break;
        case "remove_entry": delete all[args.path];break;
        case "read_entry": return all[args.path];
        case "entry_history": return Array.from({length:12},(_,i)=>["author","date","change "+i]);
        case "score_entry": return args.path.endsWith("password") ? 17 : 100;
        case "desktop_settings": return {version:"0.1.0",autostart:false,shortcut:"CommandOrControl+Shift+P"};
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
  await length.fill("12");await page.getByText("길이 저장").click();
  await page.getByRole("button",{name:"새 항목"}).click();
  await page.getByLabel("항목 경로").fill("demo");
  const raw=page.getByLabel("원문");
  await page.getByText("비밀번호 생성").click();const generated=await raw.inputValue();expect(generated).toHaveLength(12);
  await page.getByText("비밀번호 생성").click();expect(await raw.inputValue()).not.toEqual(generated);
  await raw.fill("Secure2026!\nline two\n");await expect(page.getByText(/강도 100%/)).toBeVisible();
  await page.getByRole("button",{name:"저장",exact:true}).click();await expect(page.getByRole("heading",{name:"demo"})).toBeVisible();
  await expect(quick.getByRole("option",{name:"demo"})).toBeVisible();await expect(raw).toHaveCount(0);
  await page.getByRole("button",{name:"복사",exact:true}).click();await expect(raw).toHaveCount(0);
  await page.getByText("편집",{exact:true}).click();await expect(raw).toHaveValue("Secure2026!\nline two\n");
  await raw.fill("discard");await page.getByText("편집 취소").click();await page.getByText("표시",{exact:true}).click();
  await expect(raw).toHaveValue("Secure2026!\nline two\n");await page.getByText("숨기기",{exact:true}).click();
  await page.getByText("편집",{exact:true}).click();await raw.fill("kept\nnew line\n");
  await page.getByRole("button",{name:"저장",exact:true}).click();await page.getByText("표시",{exact:true}).click();await expect(raw).toHaveValue("kept\nnew line\n");
  await page.evaluate(()=>window.dispatchEvent(new Event("pagehide")));await expect(raw).toHaveCount(0);
  await page.getByRole("button",{name:"다음"}).click();await expect(page.getByText("date · author · change 11")).toBeVisible();
  await page.getByText("삭제",{exact:true}).click();await page.getByText("취소",{exact:true}).click();
  await page.getByText("삭제",{exact:true}).click();await page.getByText("삭제 확인",{exact:true}).click();
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
  await page.getByRole("button",{name:"work/password · 17%"}).click();await expect(page.getByRole("heading",{name:"work/password"})).toBeVisible();
  await page.route("https://api.github.com/repos/yoophi/gopass-desktop/releases/latest",route=>route.fulfill({json:{tag_name:"v0.2.0"}}));
  await page.getByText("설정",{exact:true}).click();await page.getByText("새 버전 확인").click();
  await expect(page.getByText("새 릴리스 v0.2.0")).toBeVisible();await page.getByText("릴리스 페이지 열기").click();
  await expect.poll(()=>page.evaluate(()=>sessionStorage.getItem("releasesOpened"))).toEqual("yes");
});
