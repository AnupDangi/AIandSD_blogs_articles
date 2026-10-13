import Link from "next/link";
import { ProfileEditor } from "@/components/profile-editor";
import { SignOutButton } from "@/components/sign-out-button";
import { createSupabaseServerClient } from "@/lib/server/supabase";
import { ThemePreference } from "@/components/theme-preference";

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = supabase ? await supabase.auth.getClaims() : { data: null };
  const email = typeof data?.claims?.email === "string" ? data.claims.email : null;

  return <section className="settings-page">
    <div className="lesson-breadcrumb"><Link href="/dashboard">My learning</Link><span>/</span><span>Account settings</span></div>
    <span className="eyebrow">YOUR ACCOUNT</span>
    <h1>Account settings</h1>
    <p className="settings-intro">Manage your sign-in and make the learning space comfortable for you.</p>
    {email ? <div className="settings-card"><span className="eyebrow">SIGNED IN</span><h2>{email}</h2><p>Your reading and lab access stays public. Your account is used for saved progress, assessments, hint requests, and project submissions.</p><SignOutButton /></div> : <div className="settings-card"><span className="eyebrow">GUEST LEARNER</span><h2>Sign in to sync learning.</h2><p>Reading and visual labs remain open without an account.</p><Link className="button-primary" href="/sign-in?next=%2Fsettings">Sign in <span>↗</span></Link></div>}
    <ProfileEditor signedIn={Boolean(email)} />
    <div className="settings-card"><span className="eyebrow">Appearance</span><h2>Your reading space</h2><p>Choose a light or dark interface, or follow your device. This preference is saved in this browser. Text size and reading fonts can be adjusted inside each lesson.</p><ThemePreference /></div>
  </section>;
}
