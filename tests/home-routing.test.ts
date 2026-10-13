import { describe, expect, it, vi } from "vitest";

const { createClient, redirect } = vi.hoisted(() => ({
  createClient: vi.fn(),
  redirect: vi.fn(() => { throw new Error("NEXT_REDIRECT"); }),
}));
vi.mock("@/lib/server/supabase", () => ({ createSupabaseServerClient: createClient }));
vi.mock("next/navigation", () => ({ redirect }));
import HomePage from "@/app/page";

describe("home chooses public discovery or the learner workspace", () => {
  it("renders public discovery without an auth configuration", async () => {
    createClient.mockResolvedValue(null);
    expect(await HomePage()).toBeTruthy();
    expect(redirect).not.toHaveBeenCalled();
  });
  it("keeps the landing public when validated claims have no learner ID", async () => {
    createClient.mockResolvedValue({ auth: { getClaims: vi.fn().mockResolvedValue({ data: { claims: {} } }) } });
    expect(await HomePage()).toBeTruthy();
    expect(redirect).not.toHaveBeenCalled();
  });
  it("takes a validated signed-in learner to the dashboard", async () => {
    createClient.mockResolvedValue({ auth: { getClaims: vi.fn().mockResolvedValue({ data: { claims: { sub: "authenticated-learner" } } }) } });
    await expect(HomePage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/dashboard");
  });
});
