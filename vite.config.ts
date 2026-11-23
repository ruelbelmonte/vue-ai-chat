/// <reference types="vitest/config" />
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves the demo from /vue-ai-chat/; local dev stays at /.
  base: process.env.PAGES_BASE ?? "/",
  plugins: [vue()],
  server: {
    proxy: { "/api": "http://127.0.0.1:8788" },
  },
  test: {
    environment: "jsdom",
  },
});
