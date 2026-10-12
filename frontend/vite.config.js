import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (/[/\\]node_modules[/\\]livekit-client[/\\]/.test(id)) return "livekit-client";
          if (/[/\\]node_modules[/\\]@livekit[/\\]/.test(id)) return "livekit-components";
        },
      },
    },
  },
});
