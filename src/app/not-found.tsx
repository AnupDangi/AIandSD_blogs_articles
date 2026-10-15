import Image from "next/image";
import Link from "next/link";
import { AcademyFooter } from "@/components/academy-footer";
import { AcademyHeader } from "@/components/academy-header";
import { ArrowRight } from "@/components/icons";

export default function NotFound() {
  return <div className="academy-shell">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <AcademyHeader />
    <main id="main-content" tabIndex={-1} className="missing-page">
      <div>
        <h1>This page is not here.</h1>
        <p>The lesson or page may have moved. Browse the course library or return to your learning dashboard.</p>
        <div className="missing-actions">
          <Link className="button-primary" href="/courses">Explore courses<ArrowRight /></Link>
          <Link className="button-secondary" href="/dashboard">My learning</Link>
        </div>
      </div>
      <figure><Image src="/academy-learning-studio.webp" width={1448} height={1086} sizes="(max-width: 860px) 420px, 45vw" alt="Conceptual learning workbench with connected teal panels and an open notebook." /></figure>
    </main>
    <AcademyFooter />
  </div>;
}
