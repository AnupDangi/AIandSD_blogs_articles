import Link from "next/link";
import { BrandMark } from "./brand-mark";

export function AcademyFooter() {
  return <footer className="site-footer"><div className="footer-identity"><Link href="/" className="brand"><BrandMark className="brand-mark brand-mark-small"/><span>LearnLikeADev</span></Link><p>Understand the mechanism. Build with evidence.</p></div><nav aria-label="Footer navigation"><Link href="/courses">Courses</Link><Link href="/projects">Projects</Link><Link href="/resources">Study resources</Link><Link href="/settings">Account</Link></nav><p className="footer-note">Built for curious engineers. Course content is being reviewed.</p></footer>;
}
