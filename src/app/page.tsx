import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AcademyHeader } from "@/components/academy-header";
import { AcademyFooter } from "@/components/academy-footer";
import { DiscoveryLab } from "@/components/discovery-lab";
import { createSupabaseServerClient } from "@/lib/server/supabase";
import "@/components/discovery.css";

export const metadata: Metadata = {
  title: "Learn technology by building",
  description: "Explore visual engineering lessons, test your understanding, and build a document intelligence application with LearnLikeADev.",
};

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const { data } = supabase ? await supabase.auth.getClaims() : { data: null };
  if (typeof data?.claims?.sub === "string") redirect("/dashboard");

  return (
    <div className="academy-shell discovery-home">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <AcademyHeader />
      <main id="main-content" tabIndex={-1}>
        <section className="discovery-hero discovery-width" aria-labelledby="home-title">
          <div className="discovery-hero-copy">
            <p className="discovery-kicker">A learning studio for engineers</p>
            <h1 id="home-title">Make the ideas<br />work in your hands.</h1>
            <p className="discovery-lead">Explore the moving parts of AI systems. Test an idea in a visual lab, then put it to work in a project.</p>
            <div className="discovery-actions">
              <Link className="discovery-button discovery-button-primary" href="/courses">Explore courses</Link>
              <Link className="discovery-button discovery-button-secondary" href="/learn/transformer-attention-for-engineers">Preview a lesson</Link>
            </div>
            <p className="discovery-access-note">Read and experiment without an account.</p>
          </div>
          <figure className="discovery-hero-figure discovery-live-figure">
            <div className="discovery-live-lab"><DiscoveryLab /></div>
            <figcaption><span>Same deterministic fixture used in Chapter 2.</span><Link href="/learn/tokens-decoding-and-generation">Open the full lesson</Link></figcaption>
          </figure>
        </section>

        <ol className="discovery-loop discovery-width" aria-label="How learning works">
          {[["Understand", "See how the system fits together."], ["Predict", "Decide what a change will do."], ["Experiment", "Inspect the result in a visual lab."], ["Build", "Apply the lesson to your project."]].map(([title, copy], index) => (
            <li key={title}><span className="discovery-step">{index + 1}</span><div><strong>{title}</strong><p>{copy}</p></div></li>
          ))}
        </ol>

        <section className="discovery-project discovery-width" aria-labelledby="project-heading">
          <div className="discovery-project-copy">
            <p className="discovery-kicker">Start with Applied AI</p>
            <h2 id="project-heading">One course.<br />A system that grows with you.</h2>
            <p>Build a document intelligence application: retrieve evidence, cite answers, evaluate failures, and recover interrupted work.</p>
            <Link className="discovery-button discovery-button-primary" href="/courses/reliable-ai-applications">Explore Reliable AI Applications</Link>
            <p className="discovery-development">Course in development. All 40 draft lessons are open for reading; editorial review is in progress.</p>
          </div>
          <div className="discovery-project-path">
            <div className="discovery-project-facts"><span>8 modules</span><span>40 draft lessons</span><span>Python project</span></div>
            <ol>
              <li><span>1</span><div><h3>Make the first model call dependable</h3><p>Typed outputs, token budgets, and model boundaries.</p></div></li>
              <li><span>2</span><div><h3>Find and cite useful evidence</h3><p>Ingestion, search, reranking, and retrieval evaluation.</p></div></li>
              <li><span>3</span><div><h3>Handle actions and interruptions</h3><p>Bounded tools, checkpoints, permissions, and recovery.</p></div></li>
              <li><span>4</span><div><h3>Measure readiness for production</h3><p>Evaluation, traces, failure drills, and a final runbook.</p></div></li>
            </ol>
            <Link href="/projects" className="discovery-inline-link">See the project milestones</Link>
          </div>
        </section>

        <section className="discovery-preview-section discovery-width" aria-labelledby="preview-heading">
          <div className="discovery-section-heading"><div><p className="discovery-kicker">Try the learning workspace</p><h2 id="preview-heading">See it. Change it. Explain it.</h2></div><p>Visual models sit beside the lesson. Change an input, inspect the result, and check your understanding.</p></div>
          <div className="discovery-previews">
            <article className="discovery-preview">
              <Link className="discovery-preview-image" href="/learn/transformer-attention-for-engineers" tabIndex={-1} aria-hidden="true"><Image src="/attention-context-analogy.png" width={1536} height={1024} sizes="(max-width: 760px) 100vw, 45vw" alt="" /></Link>
              <div><p className="discovery-preview-kind">Attention lab</p><h3><Link href="/learn/transformer-attention-for-engineers">How does a token use its context?</Link></h3><p>Step through query, key, and value in a labeled toy model. Inspect the weights before reading the explanation.</p><Link className="discovery-inline-link" href="/learn/transformer-attention-for-engineers">Try the attention lesson</Link></div>
            </article>
            <article className="discovery-preview">
              <Link className="discovery-preview-image" href="/learn/chunking-and-contextual-retrieval" tabIndex={-1} aria-hidden="true"><Image src="/retrieval-contextual-chunking.png" width={1536} height={1024} sizes="(max-width: 760px) 100vw, 45vw" alt="" /></Link>
              <div><p className="discovery-preview-kind">Retrieval lab</p><h3><Link href="/learn/chunking-and-contextual-retrieval">Which evidence reaches the model?</Link></h3><p>Compare chunks and rankings, then see how context changes the evidence available for an answer.</p><Link className="discovery-inline-link" href="/learn/chunking-and-contextual-retrieval">Try the retrieval lesson</Link></div>
            </article>
          </div>
          <p className="discovery-preview-note">These lessons are drafts. Illustrations explain the concepts; simulations use explicit toy examples.</p>
        </section>

        <section className="discovery-more discovery-width" aria-labelledby="more-heading">
          <div><h2 id="more-heading">Follow your next question.</h2><p>Browse the topic library and reading paths beyond Applied AI.</p></div>
          <div className="discovery-track-links"><Link href="/courses/system-design">System Design<span>Course roadmap</span></Link><Link href="/courses/cloud-engineering">Cloud Engineering<span>Course roadmap</span></Link><Link href="/courses/60-day-sprint">60-Day Sprint<span>Learning roadmap</span></Link></div>
        </section>

        <section className="discovery-account discovery-width" aria-labelledby="account-heading">
          <div><h2 id="account-heading">Give your learning a home.</h2><p>Create an account for your learning dashboard, saved progress, and project submission history.</p></div>
          <Link className="discovery-button discovery-button-primary" href="/sign-in?next=%2Fdashboard">Create an account</Link>
        </section>
      </main>
      <AcademyFooter />
    </div>
  );
}
