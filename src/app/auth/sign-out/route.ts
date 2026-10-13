import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/server/supabase";
import { noStoreJson, rejectCrossOrigin } from "@/lib/server/http";

export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "setup_required" }, { status: 503 });
  }
  const { error } = await supabase.auth.signOut();
  if (error) return NextResponse.json({ error: "sign_out_unavailable" }, { status: 503 });
  return noStoreJson({ signedOut: true });
}
