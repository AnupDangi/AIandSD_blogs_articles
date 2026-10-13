import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ signInWithOAuth: vi.fn() }));

vi.mock("@/lib/server/supabase", () => ({
  createSupabaseServerClient: async () => ({ auth: { signInWithOAuth: state.signInWithOAuth } }),
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
});
