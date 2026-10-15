import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AcademyHeader } from "@/components/academy-header";
import { AcademyFooter } from "@/components/academy-footer";
import { DiscoveryLab } from "@/components/discovery-lab";
import { ArrowRight, ArrowUpRight, BookOpenText, CalendarDots, Cloud, Flask, Hammer, Lightbulb, TreeStructure } from "@/components/icons";
import { courses, lessons } from "@/content/catalog";
import { topics } from "@/content/topics";
import { createSupabaseServerClient } from "@/lib/server/supabase";
import "@/components/discovery.css";

export const metadata: Metadata = {
  title: { absolute: "LearnLikeADev: learn technology by building" },
  description: "Explore visual engineering lessons, test your understanding, and build a document intelligence application with LearnLikeADev.",
};

const learningLoop = [
  { title: "Understand", copy: "See how the system fits together.", Icon: BookOpenText },
  { title: "Predict", copy: "Decide what a change will do.", Icon: Lightbulb },
  { title: "Experiment", copy: "Inspect the result in a visual lab.", Icon: Flask },
  { title: "Build", copy: "Apply the lesson to your project.", Icon: Hammer },
];

const projectPhases = [
  { title: "Make the first model call dependable", copy: "Typed outputs, token budgets, and model boundaries." },
  { title: "Find and cite useful evidence", copy: "Ingestion, search, reranking, and retrieval evaluation." },
  { title: "Handle actions and interruptions", copy: "Bounded tools, checkpoints, permissions, and recovery." },
  { title: "Measure readiness for production", copy: "Evaluation, traces, failure drills, and a final runbook." },
];

const labPreviews = [
  { slug: "transformer-attention-for-engineers", chapter: 3, image: "/attention-context-analogy.png", question: "How does a token use its context?", copy: "Step through query, key, and value in a labeled toy model. Inspect the weights before reading the explanation." },
  { slug: "inference-kv-cache-and-batching", chapter: 4, image: "/inference-continuous-batching.webp", question: "What does batching cost in memory?", copy: "Estimate KV-cache memory as sequences grow, then compare simplified batching and queue estimates." },
  { slug: "chunking-and-contextual-retrieval", chapter: 10, image: "/retrieval-contextual-chunking.png", question: "Which evidence reaches the model?", copy: "Compare chunks and rankings, then see how context changes the evidence available for an answer." },
];

const trackIcons = { "system-design": TreeStructure, cloud: Cloud, sprint: CalendarDots } as const;

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const { data } = supabase ? await supabase.auth.getClaims() : { data: null };
  if (typeof data?.claims?.sub === "string") redirect("/dashboard");

  const flagship = courses.find((course) => course.id === "applied-ai");
  const draftLessons = flagship?.modules.reduce((count, courseModule) => count + courseModule.lessonIds.length, 0) ?? lessons.length;
  const tracks = courses.filter((course) => course.id !== "applied-ai");

  return (
    <div className="academy-shell discovery-home">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <AcademyHeader />
      <main id="main-content" tabIndex={-1}>
        <section className="home-hero discovery-width" aria-labelledby="home-title">
          <div className="home-hero-copy">
            <h1 id="home-title">Make the ideas work in your hands.</h1>
            <p className="home-lead">Test how AI systems behave in visual labs, then apply each idea to a project you build. No account needed.</p>
            <div className="home-actions">
              <Link className="discovery-button discovery-button-primary" href="/courses">Explore courses<ArrowRight /></Link>
              <Link className="discovery-button discovery-button-secondary" href="/learn/transformer-attention-for-engineers">Preview a lesson</Link>
            </div>
          </div>
          <figure className="home-hero-lab">
            <div className="discovery-live-lab"><DiscoveryLab /></div>
            <figcaption>A live lab from chapter 2, running the same toy fixture as the lesson.</figcaption>
          </figure>
        </section>

        <ol className="home-loop discovery-width" aria-label="How learning works">
          {learningLoop.map(({ title, copy, Icon }) => (
            <li key={title}><Icon /><div><strong>{title}</strong><p>{copy}</p></div></li>
          ))}
        </ol>

        <section className="home-course" aria-labelledby="project-heading">
          <div className="home-course-inner discovery-width">
            <div className="home-course-image">
              <Image src="/academy-learning-studio.webp" width={1448} height={1086} sizes="(max-width: 860px) 100vw, 40vw" alt="Conceptual learning workbench with connected teal panels and an open notebook." />
            </div>
            <div className="home-course-copy">
              <span className="status-pill">Course in development</span>
              <h2 id="project-heading">One course. A system that grows with you.</h2>
              <p className="home-course-lead">Build a document intelligence application in Python: retrieve evidence, cite answers, evaluate failures, and recover interrupted work.</p>
              <ol className="home-phases">
                {projectPhases.map((phase) => <li key={phase.title}><h3>{phase.title}</h3><p>{phase.copy}</p></li>)}
              </ol>
              <div className="home-course-actions">
                <Link className="discovery-button discovery-button-primary" href="/courses/reliable-ai-applications">Explore Reliable AI Applications</Link>
                <Link href="/projects" className="discovery-inline-link">See the project milestones</Link>
              </div>
              <p className="home-course-note">{flagship?.modules.length ?? 8} modules and {draftLessons} draft chapters, all open for reading. Editorial review is in progress.</p>
            </div>
          </div>
        </section>

        <section className="home-labs discovery-width" aria-labelledby="preview-heading">
          <h2 id="preview-heading">See it. Change it. Explain it.</h2>
          <p className="home-section-lead">Visual models sit beside the lesson. Change an input, inspect the result, and check your understanding.</p>
          <div className="home-bento">
            {labPreviews.map((lab) => (
              <article className="home-bento-cell" key={lab.slug}>
                <Link className="home-bento-image" href={`/learn/${lab.slug}`} tabIndex={-1} aria-hidden="true"><Image src={lab.image} width={1672} height={941} sizes="(max-width: 860px) 100vw, 50vw" alt="" /></Link>
                <div className="home-bento-copy">
                  <p className="home-bento-meta">Chapter {lab.chapter} lab</p>
                  <h3><Link href={`/learn/${lab.slug}`}>{lab.question}</Link></h3>
                  <p>{lab.copy}</p>
                </div>
              </article>
            ))}
          </div>
          <p className="home-labs-note">These chapters are drafts. Illustrations explain the concepts; simulations use explicit toy examples.</p>
        </section>

        <section className="home-more discovery-width" aria-labelledby="more-heading">
          <div>
            <h2 id="more-heading">Follow your next question.</h2>
            <p>Browse the topic library and reading paths beyond Applied AI.</p>
          </div>
          <ul className="home-track-links">
            <li><Link href="/topics"><BookOpenText /><span><strong>Topic library</strong><small>{topics.length} topics</small></span><ArrowUpRight /></Link></li>
            {tracks.map((track) => {
              const Icon = trackIcons[track.id as keyof typeof trackIcons] ?? TreeStructure;
              return <li key={track.id}><Link href={`/courses/${track.slug}`}><Icon /><span><strong>{track.title}</strong><small>{track.status === "roadmap" ? "Roadmap" : "Learning path"}</small></span><ArrowUpRight /></Link></li>;
            })}
          </ul>
        </section>

        <section className="home-account discovery-width" aria-labelledby="account-heading">
          <div>
            <h2 id="account-heading">Give your learning a home.</h2>
            <p>Create an account for a learning dashboard, saved progress, and project submission history.</p>
          </div>
          <Link className="discovery-button discovery-button-primary" href="/sign-in?next=%2Fdashboard">Create an account</Link>
        </section>
      </main>
      <AcademyFooter />
    </div>
  );
}
