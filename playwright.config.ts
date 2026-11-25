import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  use: { baseURL: "http://localhost:1431" },
  webServer: {
    command: "pnpm --filter @gopass/desktop exec vite --port 1431 --strictPort",
    url: "http://localhost:1431",
  },
});
