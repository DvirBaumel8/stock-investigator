import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Pin to 5173 so the dev origin matches the backend CORS allow-list
  // (backend main.ts → FRONTEND_URL ?? http://localhost:5173). strictPort makes
  // the dev server fail loudly if 5173 is taken instead of silently drifting to
  // a port the backend will reject.
  server: { port: 5173, strictPort: true },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
    css: true,
  },
});
