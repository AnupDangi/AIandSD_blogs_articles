import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

export default function NotFound() {
  return <main className="academy-shell missing-page"><Link className="brand" href="/" aria-label="LearnLikeADev home"><BrandMark /><span>learnlikeadev.</span></Link><span className="eyebrow">Page not found</span><h1>Let’s find your next step.</h1><p>This lesson or page could not be found. Explore the course library or return to your learning dashboard.</p><div className="hero-actions"><Link className="button-primary" href="/courses">Explore courses →</Link><Link href="/dashboard">My learning →</Link></div></main>;
}
