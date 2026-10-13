import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/server/supabase";

export type AuthenticatedUser = { id: string };

export async function authenticateRequest(): Promise<
  | { user: AuthenticatedUser; response: null }
  | { user: null; response: NextResponse }
> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      user: null,
      response: NextResponse.json(
        { error: "setup_required", message: "Supabase authentication is not configured." },
        { status: 503 },
      ),
    };
  }

  const { data, error } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (error || typeof id !== "string" || id.length === 0) {
    return {
      user: null,
      response: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
    };
  }

  return { user: { id }, response: null };
}

export function setupRequired() {
  return NextResponse.json(
    { error: "setup_required", message: "The database is not configured." },
    { status: 503 },
  );
}

export function rejectCrossOrigin(request: Request) {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL;
  const expectedOrigin = configuredOrigin ? new URL(configuredOrigin).origin : new URL(request.url).origin;
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  let requestOrigin = origin;
  if (!requestOrigin && referer) {
    try {
      requestOrigin = new URL(referer).origin;
    } catch {
      requestOrigin = null;
    }
  }
  const fetchSite = request.headers.get("sec-fetch-site");
  if (!requestOrigin || requestOrigin !== expectedOrigin || fetchSite === "cross-site") {
    return NextResponse.json({
      error: "cross_origin_request",
      message: configuredOrigin ? `Open this app at ${expectedOrigin} to continue. It is configured for that address only.` : "This request did not come from this app.",
      expectedOrigin,
    }, { status: 403 });
  }
  return null;
}

export function badRequest(message = "Invalid request.") {
  return NextResponse.json({ error: "invalid_request", message }, { status: 400 });
}

export function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}

export async function readJson(request: Request): Promise<unknown | null> {
  try {
    const advertisedLength = Number(request.headers.get("content-length") ?? 0);
    if (advertisedLength > 64_000) return null;
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > 64_000) return null;
    return JSON.parse(body) as unknown;
  } catch {
    return null;
  }
}
