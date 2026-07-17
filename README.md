# Agent Skill Hub

Agent Skill Hub is an AI development resource selection platform. It helps users describe a project idea and then recommends a practical stack of Agent Skills, MCP Servers, GitHub AI plugins, UI component libraries, and template repositories that can be handed directly to Codex as an implementation plan.

The product is designed as a focused AI SaaS workspace: dense, calm, searchable, and optimized for technical decision making.

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/ui style components
- Motion
- Supabase
- Postgres with pgvector

## Local Development

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Current status: the V1.0 local MVP is runnable. It supports the home page, resource library, resource details, search filters, project recommendations, local favorites, and a local admin intake page. If port `3000` is already occupied, Next.js will choose the next available local port.

The V1.1 Project Analyzer is available at `/analyze`. It runs locally without an LLM and separates project analysis, tag extraction, resource recommendation, and presentation.

## Server Deployment

The production service uses `/opt/apps/agent-skill-hub`, PM2, and port `3003`. The GitHub Actions workflow deploys pushes to `main` after these repository secrets are configured:

- `SERVER_HOST`: server IP or hostname.
- `SERVER_USER`: SSH user, normally `ubuntu`.
- `DEPLOY_KEY`: the private SSH key whose public key is authorized on the server.

PostgreSQL is optional for the seed-backed MVP. When `DATABASE_URL` is configured on the server, resource reads use PostgreSQL and fall back to the local seed data if the database is unavailable.

## Environment Variables

Create a `.env.local` file when Supabase-backed reads are needed. Without these variables, the app falls back to the curated local seed data.

Expected variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
GITHUB_TOKEN=
DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-chat
```

Variable usage:

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL used by the browser client.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase public anon key used by the browser client.
- `SUPABASE_SERVICE_ROLE_KEY`: Server-only key for admin jobs, imports, and trusted writes.
- `OPENAI_API_KEY`: Optional server-side key for embeddings and recommendation generation.
- `GITHUB_TOKEN`: Server-side GitHub token. It is optional for single-repository imports, but strongly recommended for catalog sync to avoid GitHub search API rate limits.
- `DEEPSEEK_API_KEY`: Optional server-only key for AI project analysis and tag expansion. When absent, the rules engine remains available.
- `DEEPSEEK_MODEL`: Optional DeepSeek model name; defaults to `deepseek-chat`.

### Resource catalog sync

The catalog sync job imports real resources from the GitHub API, the official MCP Registry, and the npm registry. It normalizes, deduplicates, risk-labels, and upserts candidates into PostgreSQL; it does not delete curated seed resources.

Run from a server or a trusted local environment with `DATABASE_URL` configured:

```bash
npm run sync:resources -- --source=all --limit=20 --mcp-limit=100
```

Useful targeted runs:

```bash
npm run sync:resources -- --source=github --limit=30
npm run sync:resources -- --source=mcp --mcp-limit=200
npm run sync:resources -- --source=npm --limit=30
```

The sync job is additive/updating only. It stores source metadata and risk reasons in `resources.metadata`, and high-risk candidates remain visible for review instead of being silently discarded.

Do not expose server-only keys to client components.

## Current Features

Completed:

- Home page.
- Resource library page.
- Resource detail pages.
- Search page with keyword, type, tag, and risk filters.
- Project recommendation page with rule-based stack matching.
- Codex-ready development prompt generation.
- Favorites saved in localStorage.
- Local admin intake page for resource drafts.
- GitHub repository semi-automatic import in the admin page.
- Supabase schema, generated seed SQL, and server read fallback.

Planned:

- Authenticated Supabase writes.
- Persistent cloud collections.
- Production-grade admin editing.
- AI API-backed semantic recommendation.
