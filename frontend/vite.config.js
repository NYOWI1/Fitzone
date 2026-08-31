import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiPort = process.env.API_PORT || "3001";

export default defineConfig({
  envDir: '..',
  plugins: [react()],
  server: {
    preTransformRequests: false,
    proxy: {
      "/api": `http://127.0.0.1:${apiPort}`,
    },
  },
  optimizeDeps: {
    holdUntilCrawlEnd: false,
  },
});
