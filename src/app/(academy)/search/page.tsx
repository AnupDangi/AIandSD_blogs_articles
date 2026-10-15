import type { Metadata } from "next";
import Link from "next/link";
import { searchContent } from "@/content/search";
import "@/components/library-discovery.css";

type SearchPageProps = { searchParams: Promise<{ q?: string | string[] }> };

export const metadata: Metadata = {
  title: "Search",
  description: "Search lessons, topics, projects, and sources across the academy.",
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = Array.isArray(params.q) ? params.q[0] ?? "" : params.q ?? "";
  const safeQuery = query.trim().slice(0, 120);
  const results = searchContent(safeQuery);

  return <section className="library-page studio-library search-page">
    <header className="library-hero search-hero">
      <div className="lesson-breadcrumb"><Link href="/courses">Courses</Link><span>/</span><span>Search</span></div>
      <h1>Find your next step.</h1>
      <p>Search courses, lesson drafts, concepts, and study sources together.</p>
    </header>
    <form className="academy-search-form" action="/search" role="search">
      <label htmlFor="academy-query">Search courses and learning material</label>
      <div><input id="academy-query" type="search" name="q" defaultValue={safeQuery} maxLength={120} placeholder="Try retrieval, attention, or evaluation"/><button className="button-primary" type="submit">Search</button></div>
    </form>
    {safeQuery ? <section className="search-results" aria-live="polite" aria-labelledby="search-results-title">
      <div className="search-results-heading"><h2 id="search-results-title">{results.length ? `${results.length} results` : "No results yet"}</h2><p>for “{safeQuery}”</p></div>
      {results.length ? <div className="search-result-list">{results.map((result) => {
        const external = result.href.startsWith("https://");
        return <article className="search-result" key={`${result.kind}:${result.id}`}>
          <div><span className="library-result-kind">{result.kind}</span><h3>{external ? <a href={result.href} target="_blank" rel="noopener noreferrer">{result.title}<span className="sr-only"> (opens in a new tab)</span></a> : <Link href={result.href}>{result.title}</Link>}</h3><p>{result.description}</p><small>{result.meta}</small></div>
        </article>;
      })}</div> : <div className="library-empty"><p>Try a broader concept or a different spelling.</p><Link href="/topics">Browse topic clusters</Link></div>}
    </section> : <div className="search-suggestions"><h2>Start with a concept</h2><div>{["attention", "retrieval", "evaluation", "production reliability"].map((term) => <Link key={term} href={`/search?q=${encodeURIComponent(term)}`}>{term.charAt(0).toUpperCase() + term.slice(1)}</Link>)}</div><div className="library-context"><strong>Prefer to browse?</strong><p>Follow the course sequence, explore connected topics, or choose a source to read.</p><nav aria-label="Browse learning material"><Link href="/courses">Courses</Link><Link href="/topics">Topics</Link><Link href="/resources">Resources</Link></nav></div></div>}
  </section>;
}
