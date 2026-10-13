import { defineConfig } from "@playwright/test";

const baseURL = "http://127.0.0.1:4179";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL,
    browserName: "chromium",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 4179",
    url: `${baseURL}/courses`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      PATH: process.env.PATH ?? "",
      NODE_ENV: "production",
      NEXT_TELEMETRY_DISABLED: "1",
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "playwright-public-key-placeholder",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "playwright-anon-key-placeholder",
      NEXT_PUBLIC_APP_URL: baseURL,
      DATABASE_URL: "postgresql://disabled:disabled@127.0.0.1:65432/disabled",
      DIRECT_URL: "postgresql://disabled:disabled@127.0.0.1:65432/disabled",
      SUPABASE_SERVICE_ROLE_KEY: "",
      GOOGLE_CLIENT_ID: "",
      GOOGLE_CLIENT_SECRET: "",
      GITHUB_CLIENT_ID: "",
      GITHUB_CLIENT_SECRET: "",
      OPENAI_API_KEY: "",
      OPENROUTER_API_KEY: "",
    },
  },
});
