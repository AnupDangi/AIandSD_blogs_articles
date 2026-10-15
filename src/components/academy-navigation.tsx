"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GithubLogo } from "@/components/icons";
import { GITHUB_LABEL, GITHUB_URL } from "@/lib/site";

const links = [["Courses", "/courses"], ["Topics", "/topics"], ["Projects", "/projects"], ["Resources", "/resources"], ["Search", "/search"], ["My learning", "/dashboard"]] as const;

export function AcademyNavigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  return <nav className={mobile ? "mobile-navigation" : "primary-nav"} aria-label={mobile ? "Mobile navigation" : "Main navigation"}>
    {links.map(([label, href]) => <Link key={href} href={href} aria-current={pathname === href || pathname.startsWith(`${href}/`) ? "page" : undefined}>{label}</Link>)}
    {mobile && <a className="mobile-github" href={GITHUB_URL} target="_blank" rel="noopener noreferrer"><GithubLogo /><span>{GITHUB_LABEL}</span><span className="sr-only"> (opens in a new tab)</span></a>}
  </nav>;
}
