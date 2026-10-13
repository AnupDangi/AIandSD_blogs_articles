import Link from "next/link";
import { SignInForm } from "@/components/sign-in-form";
import { BrandMark } from "@/components/brand-mark";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const params = await searchParams;
  const next = params.next?.startsWith("/") && !params.next.startsWith("//") ? params.next : "/dashboard";
  return <section className="sign-in-page">
    <div className="sign-in-aside">
      <span className="eyebrow">KEEP YOUR PLACE</span>
      <h1>Pick up where<br/>you left off.</h1>
      <p>Save your progress, return to your projects, and pick up a lesson on another device.</p>
      <ol className="sign-in-benefits"><li>Keep your place in the course.</li><li>Review your assessment history.</li><li>Build a record of your project work.</li></ol>
      <div className="sign-in-aside-note"><p>You can keep exploring every public lesson and visual lab without an account.</p></div>
    </div>
    <div className="sign-in-card">
      <div className="sign-in-card-heading"><BrandMark /><div><span className="eyebrow">Your learning account</span><h2>Welcome to the studio.</h2><p>Sign in or create your account.</p></div></div>
      <SignInForm next={next} initialError={params.error} canonicalOrigin={canonicalOrigin()}/>
      <p className="sign-in-back"><Link href="/courses">← Continue as a guest</Link></p>
    </div>
  </section>;
}

function canonicalOrigin() {
  try { return process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin : undefined; } catch { return undefined; }
}
