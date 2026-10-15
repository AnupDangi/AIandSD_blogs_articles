# LearnLikeADev

A learning site for software engineers. Each lesson explains one mechanism, lets you change its inputs in a visual lab, checks your understanding with a short quiz, and ties into a project you build yourself.

It is a Next.js app (App Router, React 19, TypeScript) with Supabase for sign-in and Postgres, and Prisma for server-side data access. Everything in the repository is TypeScript.

## Status

| Course | Lessons | State |
|---|---|---|
| Reliable AI Applications | 40 chapters in 8 modules, 8 project milestones | Draft chapters are readable. Lessons, quiz questions and hints are still in editorial review, so the course is not published as complete. |
| Practical System Design | 52 chapter drafts | Roadmap only. Not yet shown in the reader. |
| Cloud Production Engineering | index only | Roadmap only. |
| 60-Day AI + System Design Sprint | 60 daily pages | Roadmap only. Not yet shown in the reader. |

Guests can read every lesson and use every lab. Signing in adds saved progress, quiz attempts that resume on another device, bookmarks, a profile, hint history and project submissions.

## What learners do in the flagship course

1. Read a chapter. Every chapter links its sources, and links open in a new tab.
2. Predict, then run the chapter's visual lab (for example token sampling, attention, KV-cache scheduling, retrieval, trust boundaries).
3. Take the chapter's knowledge check. Answers are graded on the server and answer keys are never sent to the browser.
4. Build one reliable AI application in TypeScript, in their own GitHub repository, one milestone per module. They submit the repository link and a short reflection. Submissions are self-reported: the site does not inspect the repository.
5. Watch the linked lecture videos in the page. A video loads from YouTube only after the learner presses play, and chapter buttons jump to published chapter times.

## Requirements

- Node.js 22 or later (`.nvmrc` pins 22)
- npm 10 or later
- A Supabase project for sign-in and the database (optional for reading lessons)
- PostgreSQL server tools, only for `npm run dev:local` and `npm run test:integration`

## Run it locally

```bash
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev
```

Open http://localhost:3000. `npm run dev` is pinned to port 3000 and exits with an error if the port is busy. Sign-in depends on one address: `NEXT_PUBLIC_APP_URL` is used for the OAuth redirect, the sign-in cookie and the CSRF origin check, so open the app at exactly that address. The sign-in page warns if you open it somewhere else.

`npm run dev:local` serves the same app on port 3000 against a throwaway local PostgreSQL (data in `.local-stack/`). It applies the migrations and imports the draft catalog, marked published in that local database only, so quizzes and hints can be tried without touching a hosted database. Sign-in still uses your Supabase project. It needs the private review bundle described under "Content rules".

## Environment variables

Server-only values must never be exposed to browser code or committed.

| Variable | Needed for | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | sign-in | Project URL. Public. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | sign-in | Publishable key. Public. `NEXT_PUBLIC_SUPABASE_ANON_KEY` is accepted as a fallback. |
| `NEXT_PUBLIC_APP_URL` | sign-in, CSRF check | Exact origin of the site, for example `http://localhost:3000` or your production URL. Baked in at build time, so set it before building. |
| `DATABASE_URL` | saved learner data | Supabase transaction pooler (port 6543). Server-only. |
| `DIRECT_URL` | migrations | Supabase session pooler (port 5432). Server-only. |
| `AI_MONTHLY_BUDGET_USD`, `AI_DAILY_REQUEST_LIMIT` | hint quotas | Defaults 30 and 10. |
| `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` | optional hint selection | Hint text is always authored and reviewed. With a key set, a model may only pick which authored hint to show, never writes text and never sees answer keys. Without a key, a deterministic fallback picks the hint. See `prisma/README.md`. |
| `CURRICULUM_IMPORT_TARGET`, `CURRICULUM_STAGING_PROJECT_REF`, `CURRICULUM_PRODUCTION_PROJECT_REF` | catalog import | Used only by the guarded importer. |

Both database URLs need `sslmode=verify-full` and `sslrootcert=certs/supabase-prod-root.crt`. That file is Supabase's public root certificate and is committed in `certs/`.

## Sign-in setup (Supabase)

In the Supabase dashboard, under Authentication, URL configuration, add your site URL and `<your origin>/**` to the redirect URLs (for local work, `http://localhost:3000/**`). Enable the Google, GitHub and email providers you want. The Google and GitHub OAuth apps keep using Supabase's own callback, `https://<project-ref>.supabase.co/auth/v1/callback`. Email sign-in links must be opened in the same browser that requested them.

## Database

Learner data lives in a private Postgres schema called `app`. The Supabase Data API roles have no access to it, and the app reaches it only through server-side Prisma. See [`prisma/README.md`](prisma/README.md) for migrations and the guarded import path.

```bash
npm run prisma:generate   # type generation only, no connection
npm run prisma:migrate    # applies reviewed migrations to DIRECT_URL
npm run curriculum:check  # validates the catalog and private bundle, opens no connection
```

The course catalog is imported only after the private review sign-off passes. Do not use `prisma migrate dev`, `db push` or `supabase db push` against a hosted project.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on port 3000 |
| `npm run dev:local` | Dev server plus a local Postgres with the draft catalog |
| `npm run build` | Generate the Prisma client and build for production |
| `npm run start` | Serve the production build |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | Browser tests (Playwright) against a production build on port 4179 |
| `npm run test:integration` | Database tests against a disposable local Postgres |
| `npm run content:check` | Validates lessons, questions and resources |
| `npm run public-assets:check` | Checks public files for private answer material |
| `npm run review:export` / `npm run review:restore` | Encrypted backup and restore of the private review bundle |

## Project layout

```
src/app/            routes: landing, courses, lessons, assessments, topics, resources,
                    projects, dashboard, settings, sign-in, and the /api handlers
src/components/     UI, lesson workspace, visual-lab engines, video player, styles
src/content/        typed course catalog, lesson sections, questions, milestones
src/lib/            pure logic for labs and scenarios, auth error messages, video helpers
src/lib/server/     server-only code: database client, Supabase client, hint accounting
prisma/             schema, migrations, import and publication guards
curriculum/         public manifests, resources, scenario fixtures, diagram sketches
docs/applied-ai/    the 40 chapter drafts and appendices (Markdown, read by the lesson page)
docs/system-design/ docs/60-day/ docs/cloud/   roadmap drafts, not yet in the reader
source-material/    the four original source PDFs, kept unchanged
scripts/            content validation, import dry run, local stack, review bundle tools
tests/ e2e/ integration/   unit, browser and database tests
certs/              Supabase public root certificate
```

## Content rules

- Chapter drafts are plain Markdown in `docs/applied-ai`. The lesson page splits each into concept, worked example and project sections by its `##` headings. The line `## Course project — milestone N` is required in every chapter and is checked by `npm run content:check`.
- Public question prompts are in the repository. Answer keys, feedback notes, hint packs and the review sign-off are private and live in `curriculum/private/`, which is never committed.
- The catalog cannot be published to a production database until the private review file records a reviewer, a date and a matching content fingerprint for both the questions and the hints.
- Resource links are checked for reachability and topic fit. Lesson claims still need editorial review before a lesson is marked reviewed.

## Deploying to Vercel

1. Create the Vercel project from this repository. `vercel.json` sets `npm ci`, `npm run build` and the `syd1` function region. The Prisma client is generated on install (`postinstall`), so the build also works if the build command is left on its default.
2. Set the environment variables above in Vercel. Set `NEXT_PUBLIC_APP_URL` to the production origin for the Production environment, and do not attach production credentials to Preview deployments.
3. In Supabase, add the production URL to the redirect URLs.
4. Function regions: `vercel.json` pins `syd1` to sit near the Sydney Supabase project. Change it if your database is elsewhere.
5. The `Deploy to Vercel` GitHub Actions workflow is manual (`workflow_dispatch`) and needs the repository secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`. Nothing deploys on push.

CI (`Academy CI`) runs content validation, unit tests, type checking, lint, a production build, the browser tests and the database tests on every push and pull request.

## Known limits

- The course catalog is not imported into the hosted database yet, so quizzes and hints show "not published" there until the review gate passes. Use `npm run dev:local` to try them.
- Course project submissions are self-reported.
- System Design, Cloud and the 60-day sprint are roadmaps; their source files are retained but not routed into the reader.
- Manual screen-reader and browser-zoom testing, production sign-in with two real accounts, and an email provider for sign-in links are still to do.
