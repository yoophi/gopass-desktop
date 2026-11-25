import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import assert from "node:assert/strict";

const fixture = mkdtempSync(join(tmpdir(),"gopass-extension-"));
const env = {...process.env, GOPASS_HOMEDIR:join(fixture,"config")};
const profile = join(fixture,"profile");
let browser;
try {
  execFileSync("gopass",["init","--crypto","plain","--storage","fs","--path",join(fixture,"store"),"test"],{env,stdio:"ignore"});
  execFileSync("gopass",["insert","work/테스트"],{env,input:"dummy\n"});
  const path = execFileSync(process.execPath,["scripts/native-manifest.mjs",join(profile,"NativeMessagingHosts"),
    resolve("target/debug/gopass-native-host")],{encoding:"utf8"}).trim();
  const [url] = JSON.parse(readFileSync(path)).allowed_origins;
  const extension = resolve("apps/chrome-extension/dist");
  browser = await chromium.launchPersistentContext(profile,{channel:"chromium",headless:true,env,
    args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
  const popup = await browser.newPage();
  await popup.goto(url+"index.html");
  await popup.locator("li, [role=alert]").first().waitFor();
  assert.deepEqual(await popup.locator("li").allTextContents(),["work/테스트"],await popup.locator("body").innerText());
  await popup.getByRole("textbox").fill("테스트 WORK");
  assert.deepEqual(await popup.locator("li").allTextContents(),["work/테스트"]);
  await popup.getByRole("textbox").fill("unknown");
  await popup.getByText("검색 결과가 없습니다.").waitFor();
  console.log("Chromium extension → native messaging → isolated gopass store passed.");
} finally {
  await browser?.close();
  rmSync(fixture,{recursive:true,force:true});
}
