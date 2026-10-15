import type { Metadata } from "next";
import Link from "next/link";
import { SignInForm } from "@/components/sign-in-form";
import { ArrowLeft, Check } from "@/components/icons";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to save reading progress, assessment history, and project submissions.",
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const params = await searchParams;
  const next = params.next?.startsWith("/") && !params.next.startsWith("//") ? params.next : "/dashboard";
  return <section className="sign-in-page">
    <div className="sign-in-aside">
      <h1>Pick up where you left off.</h1>
      <p>Save your progress, return to your project, and continue a lesson on another device.</p>
      <ul className="sign-in-benefits">
        <li><Check />Keep your place in the course.</li>
        <li><Check />Review your assessment history.</li>
        <li><Check />Build a record of your project work.</li>
      </ul>
      <div className="sign-in-aside-note"><p>Every public lesson and visual lab stays open without an account.</p></div>
    </div>
    <div className="sign-in-card">
      <div className="sign-in-card-heading"><h2>Sign in to LearnLikeADev</h2><p>New here? Your account is created the first time you sign in.</p></div>
      <SignInForm next={next} initialError={params.error} canonicalOrigin={canonicalOrigin()}/>
      <p className="sign-in-back"><Link href="/courses"><ArrowLeft />Continue as a guest</Link></p>
    </div>
  </section>;
}

function canonicalOrigin() {
  try { return process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin : undefined; } catch { return undefined; }
}
