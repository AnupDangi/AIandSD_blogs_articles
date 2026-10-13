import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/server/supabase";

function safeNext(next: string | null, base: string) {
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    const candidate = new URL(next, base);
    if (candidate.origin === new URL(base).origin) return candidate;
  }
  return new URL("/dashboard", base);
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  const code = url.searchParams.get("code");
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL ?? url.origin;
  if (!code) {
    url.pathname = "/sign-in";
    url.search = "?error=missing_code";
    return NextResponse.redirect(url);
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    url.pathname = "/sign-in";
    url.search = "?error=setup_required";
    return NextResponse.redirect(url);
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    url.pathname = "/sign-in";
    url.search = "?error=callback_failed";
    return NextResponse.redirect(url);
  }

  return NextResponse.redirect(safeNext(url.searchParams.get("next"), appOrigin));
}
