import { defineConfig } from "@playwright/test";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

// Load environment variables from .env.local or .env files
function loadEnvFile(filePath: string): void {
  if (existsSync(filePath)) {
    const content = readFileSync(filePath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...valueParts] = trimmed.split("=");
        if (key && valueParts.length > 0) {
          const value = valueParts.join("=").replace(/^["']|["']$/g, "");
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }
    }
  }
}

loadEnvFile(resolve(__dirname, ".env.local"));
loadEnvFile(resolve(__dirname, ".env"));

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
    env: Object.fromEntries(
      Object.entries(process.env).filter(
        ([_, value]) => value !== undefined
      )
    ) as { [key: string]: string },
  },
});
