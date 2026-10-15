import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/server/db";

export const dynamic = "force-dynamic";

/** Public liveness check. Reports only whether storage is configured and reachable, never why or where. */
export async function GET() {
  const database = getDatabase();
  let state: "not_configured" | "connected" | "unreachable" = "not_configured";
  if (database) {
    try {
      await Promise.race([
        database.$queryRaw`select 1`,
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000)),
      ]);
      state = "connected";
    } catch {
      state = "unreachable";
    }
  }
  const response = NextResponse.json({ ok: state !== "unreachable", database: state }, { status: state === "unreachable" ? 503 : 200 });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
