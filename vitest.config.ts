import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: [
      "app/**/*.test.{ts,tsx}",
      "components/**/*.test.{ts,tsx}",
      "tests/**/*.test.{ts,tsx}",
    ],
    coverage: {
      provider: "v8",
    },
  },
  resolve: {
    alias: {
      "@": new URL("./", import.meta.url).pathname,
    },
  },
});
