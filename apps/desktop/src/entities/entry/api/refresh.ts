import type { QueryClient } from "@tanstack/react-query";

export async function refreshEntries(client: QueryClient) {
  const channel = new BroadcastChannel("entries-changed");
  channel.postMessage("refresh");
  channel.close();
  await client.invalidateQueries({ queryKey: ["entries"] });
}
