# Database setup

The application stores learner data in the private PostgreSQL schema `app`. The
initial migration creates that schema and revokes access from Supabase's public
Data API roles. Runtime access uses Prisma on the server; never expose
`DATABASE_URL` or `DIRECT_URL` to browser code.

Set `DATABASE_URL` to the Supabase transaction-pool connection string for the
application runtime. Set `DIRECT_URL` to the project's session/direct connection
for migrations. Use the exact endpoints shown in the target project's Connect
dialog. Keep `sslmode=verify-full` and set `sslrootcert=certs/supabase-prod-root.crt`
on both URLs. The public Supabase root CA is committed at
`certs/supabase-prod-root.crt` (a public certificate, no private key) and stays
outside `public/`; Next's server-file tracing includes it in server deployments. Do not use `sslmode=no-verify` or
disable TLS validation. The local URL uses the same relative certificate path.

With a local `.env.local` configured, generate the client and apply reviewed
migrations:

```sh
npm run prisma:generate
npm run prisma:migrate
```

`prisma generate` does not connect to PostgreSQL. If both connection variables
are absent, the config uses a local placeholder only so type generation and
static builds can complete. Migration commands must have a valid `DIRECT_URL`,
verified TLS, an explicit target, and a reviewed migration. The initial
production migration is applied; do not use `migrate dev` or create a parallel
Supabase migration history.

Public assessment prompts are stored in `AssessmentQuestion.prompt` and use the
stable `key` as their public ID. Keep answer keys in `answerKey`; API handlers
must grade them on the server and must never select or serialize them in a
learner response. Published assessment versions are immutable: publish a new
version row rather than editing an existing row or its questions.

`HintPack.hints` stores reviewed hint records with stable IDs, levels 1–3,
misconception tags, text, and optional follow-up prompts. When a server-only
`OPENAI_API_KEY` or the pinned `OPENROUTER_API_KEY` is configured, the tutor may send the bounded, sanitized learner
observation, task key, authored misconception tags, and eligible hint IDs to
`gpt-5.6-terra`. Structured output can contain only one eligible hint ID. The
server verifies that ID and returns the matching approved text verbatim. The
model never receives answer keys or hint text and cannot write learner-facing
content. Missing keys, unsupported model overrides, quota limits, provider
errors, timeouts, malformed output, and ineligible IDs use the deterministic
authored fallback.

The provider request is disabled unless a supported provider key is present. A
direct OpenAI key takes precedence and uses `OPENAI_MODEL=gpt-5.6-terra`. If only
OpenRouter is configured, `OPENROUTER_MODEL` must be `openai/gpt-5.6-terra`; the
request requires JSON-schema support and applies a request-level input/output
price ceiling aligned with the reservation rates. Other model IDs fall back
until their pricing and reservation limits are explicitly reviewed. Daily requests are capped at
10 per account in UTC. `AiBudgetPeriod` reserves the maximum bounded request
cost against a shared $30 monthly platform cap before a provider call; successful
usage is reconciled from provider-reported cost when available, otherwise the
pinned model's token rates. Abandoned pre-call reservations
expire and release their reserve. In-flight reservations with uncertain billing
are retained conservatively. Each request has one provider attempt and is never
retried automatically.

The reservation estimate uses the published GPT-5.6 Terra rates of $2 per
million input tokens and $12 per million output tokens, charging input at the
uncached rate and counting all output tokens. The OpenRouter path is pinned to
that model and price ceiling. See [OpenAI model pricing and capabilities](https://developers.openai.com/api/docs/models/gpt-5.6-terra),
[OpenRouter structured outputs](https://openrouter.ai/docs/guides/features/structured-outputs),
[OpenRouter provider routing and price ceilings](https://openrouter.ai/docs/guides/routing/provider-routing),
and [OpenRouter usage fields](https://openrouter.ai/docs/api/api-reference/chat/create-a-chat-completion).

## Curriculum import

`prisma/import-curriculum.ts` validates the public 310-question catalog against
the ignored `curriculum/private/assessment-keys.json` and
`curriculum/private/authored-hints.json` files before connecting. It writes the
question prompts and private grading keys to the private `app` schema in one
transaction. It prints counts only; it never prints answer-key or hint text.
Hint task keys use lesson IDs, so the tutor request should use the lesson ID.

Run the no-database validation mode before configuring a target:

```sh
npm run curriculum:check
```

It verifies the private answer and hint bundles against the public content and
prints counts only. It exits before opening a database connection.

With `DIRECT_URL` set in the local environment to a staging project, import an
unpublished staging version (for validating content without learner API access):

```sh
CURRICULUM_IMPORT_TARGET=staging npx tsx prisma/import-curriculum.ts
```

To exercise learner APIs against staging, explicitly publish the staging version:

```sh
CURRICULUM_IMPORT_TARGET=staging npx tsx prisma/import-curriculum.ts --publish-staging
```

This sets publication timestamps and approves authored hint packs only in the
explicitly selected staging project. It also creates eight published project
records using the stable IDs `ai-milestone-01` through `ai-milestone-08`, one for
each cumulative course milestone. Staging publication may include draft or
in-progress lesson content so the learner APIs can be exercised before editorial
review. Production publication is a
separate explicit operation requiring `CURRICULUM_IMPORT_TARGET=production` and
`--publish`; it also requires the course to be marked complete and every lesson
reviewed. The flags cannot be combined, and target/flag mismatches fail before
the database client is created. The importer refuses to update any existing
version, published or staging; increment the curriculum version for a new
import. The importer does not run migrations, and no import command is run during
implementation.
