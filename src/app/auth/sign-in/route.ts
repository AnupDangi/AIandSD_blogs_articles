import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/server/supabase";
import { badRequest, noStoreJson, readJson, rejectCrossOrigin } from "@/lib/server/http";

const inputSchema = z.discriminatedUnion("provider", [
  z.object({ provider: z.literal("github"), next: z.string().optional() }).strict(),
  z.object({ provider: z.literal("google"), next: z.string().optional() }).strict(),
  z.object({ provider: z.literal("email"), email: z.string().trim().email().max(320), next: z.string().optional() }).strict(),
]);

function safeNext(next: string | undefined) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  const parsed = inputSchema.safeParse(await readJson(request));
  if (!parsed.success) return badRequest();
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "setup_required", message: "Supabase authentication is not configured." }, { status: 503 });
  }

  const callback = new URL("/auth/callback", process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin);
  callback.searchParams.set("next", safeNext(parsed.data.next));
  if (parsed.data.provider === "github" || parsed.data.provider === "google") {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: parsed.data.provider,
      options: { redirectTo: callback.toString() },
    });
    if (error || !data.url) return NextResponse.json({ error: "sign_in_unavailable" }, { status: 503 });
    return noStoreJson({ url: data.url });
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: callback.toString() },
  });
  if (error) return NextResponse.json({ error: "sign_in_unavailable" }, { status: 503 });
  return noStoreJson({ sent: true });
}
