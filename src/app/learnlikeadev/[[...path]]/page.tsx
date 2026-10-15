import Link from "next/link";
import { AcademyFooter } from "@/components/academy-footer";
import { AcademyHeader } from "@/components/academy-header";
import { ArrowRight } from "@/components/icons";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "This reading moved",
  description: "The former MkDocs reading site is retired. The topics now live in the LearnLikeADev academy.",
};

const legacyTargets: { prefix: string; label: string; href: string }[] = [
  { prefix: "applied-ai", label: "Reliable AI Applications course", href: "/courses/reliable-ai-applications" },
  { prefix: "system-design", label: "System Design course map", href: "/courses" },
  { prefix: "60-day", label: "60-Day Sprint roadmap", href: "/courses" },
  { prefix: "cloud", label: "Cloud roadmap", href: "/courses" },
];

function legacyPathParams(path: string[] | undefined) {
  return (path ?? []).join("/");
}

export default async function LegacyDocsPage({ params }: { params: Promise<{ path?: string[] }> }) {
  const { path } = await params;
  const joined = legacyPathParams(path);
  const match = legacyTargets.find((target) => joined.startsWith(`${target.prefix}`)) ?? null;

  return <div className="academy-shell"><a className="skip-link" href="#main-content">Skip to content</a><AcademyHeader /><main id="main-content" tabIndex={-1}><section className="settings-page legacy-page">
    <h1>The reading site moved into the academy.</h1>
    <p className="settings-intro">The former MkDocs reading pages at <code>anupdangi.github.io/learnlikeadev/</code> are retired. The same material now lives in the LearnLikeADev academy as courses, topics, and lesson drafts.</p>
    {match ? <div className="settings-card"><h2>{match.label}</h2><p>The old address <code>/{joined}</code> maps to the course and roadmap area. Specific page-to-lesson links arrive as each course&rsquo;s reading is imported.</p><Link className="button-primary" href={match.href}>Open {match.label}<ArrowRight /></Link></div> : <div className="settings-card"><h2>Explore the academy</h2><p>Open the catalog to find every course and roadmap, or search topics directly.</p><div className="lh-actions"><Link className="button-primary" href="/courses">Open the catalog<ArrowRight /></Link><Link className="lh-text-link" href="/topics">Browse topics</Link></div></div>}
    <div className="settings-card"><h2>From static pages to a learning workspace</h2><p>The academy adds lesson workspaces with visual labs, assessments with saved attempts, project milestones, and learner accounts. Reading remains open without an account.</p></div>
  </section></main><AcademyFooter /></div>;}
