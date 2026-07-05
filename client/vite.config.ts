import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
    // @voxon/voice-input is a file: symlink; without dedupe its react
    // peer dep resolves to a second copy and hooks break at runtime.
    dedupe: ["react", "react-dom"],
  },
  server: {
    // In dev, `node server.js` provides the session-init endpoint on :3000.
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
});
