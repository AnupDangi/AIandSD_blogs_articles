import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ signInWithOAuth: vi.fn(), signInWithOtp: vi.fn() }));

vi.mock("@/lib/server/supabase", () => ({
  createSupabaseServerClient: async () => ({ auth: { signInWithOAuth: state.signInWithOAuth, signInWithOtp: state.signInWithOtp } }),
}));

import { POST } from "../src/app/auth/sign-in/route";

function request(provider: "google" | "github") {
  return new Request("http://localhost:3000/auth/sign-in", {
    method: "POST",
    headers: { origin: "http://localhost:3000", "content-type": "application/json" },
    body: JSON.stringify({ provider, next: "/dashboard" }),
  });
}

describe("social sign-in route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    state.signInWithOAuth.mockResolvedValue({ data: { url: "https://provider.example/authorize" }, error: null });
  });

  it.each(["google", "github"] as const)("starts %s OAuth with the safe app callback", async (provider) => {
    const response = await POST(request(provider));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ url: "https://provider.example/authorize" });
    expect(state.signInWithOAuth).toHaveBeenCalledWith({
      provider,
      options: { redirectTo: "http://localhost:3000/auth/callback?next=%2Fdashboard" },
    });
  });

  it("explains a request from an address the app is not configured for", async () => {
    const response = await POST(new Request("http://localhost:3002/auth/sign-in", {
      method: "POST",
      headers: { origin: "http://localhost:3002", "content-type": "application/json" },
      body: JSON.stringify({ provider: "google" }),
    }));
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body).toMatchObject({ error: "cross_origin_request", expectedOrigin: "http://localhost:3000" });
    expect(body.message).toContain("http://localhost:3000");
    expect(state.signInWithOAuth).not.toHaveBeenCalled();
  });

  it("reports an email rate limit as 429 with guidance", async () => {
    state.signInWithOtp.mockResolvedValue({ error: { code: "over_email_send_rate_limit", status: 429, message: "email rate limit exceeded" } });
    const response = await POST(new Request("http://localhost:3000/auth/sign-in", {
      method: "POST",
      headers: { origin: "http://localhost:3000", "content-type": "application/json" },
      body: JSON.stringify({ provider: "email", email: "learner@example.com" }),
    }));
    expect(response.status).toBe(429);
    expect(await response.json()).toMatchObject({ error: "rate_limited" });
  });

  it("sends the email link to the app callback", async () => {
    state.signInWithOtp.mockResolvedValue({ error: null });
    const response = await POST(new Request("http://localhost:3000/auth/sign-in", {
      method: "POST",
      headers: { origin: "http://localhost:3000", "content-type": "application/json" },
      body: JSON.stringify({ provider: "email", email: "learner@example.com", next: "//evil.example" }),
    }));
    expect(await response.json()).toEqual({ sent: true });
    expect(state.signInWithOtp).toHaveBeenCalledWith({ email: "learner@example.com", options: { emailRedirectTo: "http://localhost:3000/auth/callback?next=%2Fdashboard" } });
  });
});
