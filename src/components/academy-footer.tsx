import Link from "next/link";
import { BrandLogo } from "./brand-mark";

export function AcademyFooter() {
  return <footer className="site-footer">
    <div className="footer-inner">
      <div className="footer-identity">
        <Link href="/" className="brand" aria-label="LearnLikeADev"><BrandLogo className="brand-logo brand-logo-small" /></Link>
        <p>Understand the mechanism. Build with evidence.</p>
      </div>
      <nav aria-label="Footer navigation"><Link href="/courses">Courses</Link><Link href="/topics">Topics</Link><Link href="/projects">Projects</Link><Link href="/resources">Study resources</Link><Link href="/settings">Account</Link></nav>
      <p className="footer-note">Built for curious engineers. Course chapters are drafts until editorial review is complete.</p>
    </div>
  </footer>;
}
