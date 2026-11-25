import { QuickSearch } from "@/pages/quick-search";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ExplorerPage } from "@/pages/explorer";
import "./styles.css";

const client = new QueryClient();
const changes = new BroadcastChannel("entries-changed");
changes.onmessage = () => { void client.invalidateQueries({queryKey:["entries"]}); };
const searchWindow = new URLSearchParams(location.search).get("view") === "search";
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={client}>
      {searchWindow ? <QuickSearch /> : <ExplorerPage />}
    </QueryClientProvider>
  </StrictMode>,
);
