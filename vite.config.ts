import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// GitHub Pages serves the site from /<repository>/. Override with VITE_BASE for a custom domain.
export default defineConfig({
  base: process.env.VITE_BASE ?? "/ai-reckoning/",
  plugins: [react()],
  build: {
    target: "es2022",
    sourcemap: false,
    rollupOptions: { output: { manualChunks: (id) => (id.includes("node_modules/three") || id.includes("@react-three") ? "three" : undefined) } },
  },
  test: { include: ["tests/unit/**/*.test.ts"], environment: "node" },
});
