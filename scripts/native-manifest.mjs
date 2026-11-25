import { readFileSync, writeFileSync, mkdirSync, realpathSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

const [directory, binary] = process.argv.slice(2);
if (!directory || !binary) throw Error("Usage: node scripts/native-manifest.mjs <manifest-directory> <native-host-executable>");
const extension = JSON.parse(readFileSync(new URL("../apps/chrome-extension/public/manifest.json", import.meta.url)));
const id = createHash("sha256").update(Buffer.from(extension.key,"base64")).digest("hex").slice(0,32)
  .replace(/./g,nibble=>String.fromCharCode(97 + parseInt(nibble,16)));
mkdirSync(directory,{recursive:true});
const path=join(directory,"dev.yoophi.gopass.json");
writeFileSync(path,JSON.stringify({name:"dev.yoophi.gopass",description:"gopass entry catalog",path:realpathSync(binary),type:"stdio",allowed_origins:[`chrome-extension://${id}/`]},null,2)+"\n");
console.log(path);
