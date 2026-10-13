import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/server/supabase";
import { callbackFailureCode, providerErrorCode } from "@/lib/auth-errors";

function safeNext(next: string | null, base: string) {
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    const candidate = new URL(next, base);
    if (candidate.origin === new URL(base).origin) return candidate;
  }
  return new URL("/dashboard", base);
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  // `request.nextUrl` can report a different host than the browser used (for example localhost for
  // 127.0.0.1). Redirect to the configured origin so sign-in cookies and the destination match.
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL ?? url.origin;
  const failTo = (error: string) => NextResponse.redirect(new URL(`/sign-in?error=${error}`, appOrigin));
  if (!code) return failTo(providerErrorCode(url.searchParams) ?? "missing_code");

  const supabase = await createSupabaseServerClient();
  if (!supabase) return failTo("setup_required");

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return failTo(callbackFailureCode(error));

  return NextResponse.redirect(safeNext(url.searchParams.get("next"), appOrigin));
}
