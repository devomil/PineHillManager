import { defineConfig } from "vitest/config";
import path from "path";

// Dedicated Vitest config so server-side tests are discovered too. The app's
// vite.config.ts sets `root: client`, which would otherwise scope test
// discovery to the client/ directory only. This config keeps the project root
// as the base and mirrors the path aliases used across the codebase.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  test: {
    include: [
      "client/**/*.test.{ts,tsx}",
      "server/**/*.test.ts",
      "shared/**/*.test.ts",
    ],
  },
});
