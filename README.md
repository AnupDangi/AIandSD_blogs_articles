# LearnLikeADev

Learn technology by understanding how a system works, testing it, and building a project around it. The academy is being rebuilt as a fullstack Next.js app with Supabase Auth/Postgres and Prisma.

## Run locally

Requires Node.js 22 or later. Copy `.env.example` to `.env.local` and fill in the Supabase project URL, publishable key, and server-only database URLs. AI hints remain disabled unless an `OPENAI_API_KEY` is configured.

```bash
npm install
npm run dev
```

Open http://localhost:3000. Public lessons and all eight interactive visual labs work without an account. Sign-in, saved progress, assessments, submissions, and tutor records need a configured Supabase project.

The cumulative course project is a separate Python 3.12 package with local fixtures and no paid provider requirement:

```bash
cd projects/document-intelligence
python -m unittest discover -s tests -v
python -m document_intelligence --evaluate
```

## Technology

- Next.js App Router, React, and TypeScript
- Supabase Auth, PostgreSQL, `@supabase/ssr`
- Prisma 7.10 with the PostgreSQL adapter
- Repository-authored course material and browser-side learning simulations

## Courses

The first course, **Reliable AI Applications: From Model Call to Production**, uses eight modules to build a document intelligence application. Its 40 chapter drafts are open for reading; the complete course is not published until editorial and assessment review passes. System Design, Cloud Production Engineering, and the 60-day sprint remain roadmaps while their course lessons are prepared.

The Python starter demonstrates evidence-backed answers, bounded retrieval, safe citations, resumable checkpoints, evaluation slices, bounded retries, and cache telemetry. Its extractive provider is deterministic; live-model work is an optional later exercise.

The four original source PDFs are preserved together in [`source-material/original-pdfs`](source-material/original-pdfs/README.md). The 60-day pages and 52 System Design drafts are retained. The 40 Applied AI Markdown files are cleaned working drafts; their exact pre-edit Markdown versions were not separately preserved, though the source PDF is intact.

## Database and deployment

Do not put database URLs, provider secrets, OpenAI keys, or Supabase secret keys in browser variables or Git. Apply Prisma migrations only to a verified development or staging database first. Production deployment requires Vercel environment variables, Supabase email/Google/GitHub OAuth configuration, SMTP, and optional server-side AI credentials.

Production deployment is a manual, reviewed step. The `Deploy to Vercel` GitHub Actions workflow is `workflow_dispatch` only and requires repository secrets (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`); it never runs automatically.


## Local checks and current release plan

Run npm run test, npm run typecheck, npm run lint, npm run curriculum:public-check, and npm run build. Browser checks use npm run test:e2e against an isolated production build. Database acceptance uses npm run test:integration with disposable local PostgreSQL server tools (or PG_BIN); it never falls back to the app database.

Public discovery and the signed-in learning workspace are separate; light/dark/system appearance is browser-local. System Design and sprint source files are retained in the repository but have not been routed into the academy reading UI yet.
