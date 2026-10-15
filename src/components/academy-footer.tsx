import Link from "next/link";
import { ArrowUpRight, GithubLogo } from "./icons";
import { BrandLogo } from "./brand-mark";
import { GITHUB_ISSUES_URL, GITHUB_LABEL, GITHUB_URL } from "@/lib/site";

const external = { target: "_blank", rel: "noopener noreferrer" } as const;

export function AcademyFooter() {
  return <footer className="site-footer">
    <div className="footer-inner">
      <div className="footer-identity">
        <Link href="/" className="brand" aria-label="LearnLikeADev"><BrandLogo className="brand-logo brand-logo-small" /></Link>
        <p>Understand the mechanism. Build with evidence.</p>
        <a className="footer-github" href={GITHUB_URL} {...external}><GithubLogo /><span>{GITHUB_LABEL}</span><ArrowUpRight /><span className="sr-only"> (opens in a new tab)</span></a>
      </div>
      <nav className="footer-links" aria-label="Footer navigation">
        <div className="footer-group">
          <p className="footer-heading">Explore</p>
          <ul>
            <li><Link href="/courses">Courses</Link></li>
            <li><Link href="/topics">Topics</Link></li>
            <li><Link href="/projects">Projects</Link></li>
            <li><Link href="/resources">Study resources</Link></li>
            <li><Link href="/settings">Account</Link></li>
          </ul>
        </div>
        <div className="footer-group">
          <p className="footer-heading">Open source</p>
          <ul>
            <li><a href={GITHUB_URL} {...external}>Source code<span className="sr-only"> (opens in a new tab)</span></a></li>
            <li><a href={GITHUB_ISSUES_URL} {...external}>Report an issue<span className="sr-only"> (opens in a new tab)</span></a></li>
          </ul>
        </div>
      </nav>
      <p className="footer-note">Built for curious engineers. Course chapters are drafts until editorial review is complete.</p>
    </div>
  </footer>;
}
