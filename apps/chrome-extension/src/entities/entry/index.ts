import type { EntryCatalog } from "@gopass/entries";

export const catalog: EntryCatalog = {
  async listPaths() {
    const reply = await chrome.runtime.sendNativeMessage("dev.yoophi.gopass", {action:"list_entries"});
    if (typeof reply?.error === "string") throw new Error(reply.error);
    if (!Array.isArray(reply?.paths) || !reply.paths.every((item:unknown)=>typeof item==="string")) {
      throw new Error("호스트 응답을 읽을 수 없습니다.");
    }
    return reply.paths;
  },
};
