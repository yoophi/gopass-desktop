import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SearchPage } from "../pages/search";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={new QueryClient()}><SearchPage /></QueryClientProvider>
);
