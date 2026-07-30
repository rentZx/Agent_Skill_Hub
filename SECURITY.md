# Agent Skill Hub Security

## Production Boundaries

- Production `/admin` and the GitHub import/search write surfaces are disabled by default.
- The public analyze API enforces JSON body limits, input length limits, per-IP rate limits, and a process-level concurrency limit.
- Database access uses a non-superuser runtime role with data-only permissions.
- Next.js listens on `127.0.0.1:3003` and must be reached through Nginx.
- Server-only credentials belong in `/opt/apps/agent-skill-hub/.env.local` with mode `0600`.
- Model provider API keys are supplied by users, persisted only in their current browser, and forwarded transiently through the analyze route to a fixed official provider endpoint.
- GitHub Actions use immutable action commit pins and an empty default permission set.

## Required Before Public Launch

1. Put the public site behind a domain with HTTPS. Do not collect project descriptions over plain HTTP.
2. Keep the admin surface disabled until a real administrator authentication flow, server-side authorization, audit log, and CSRF protection exist.
3. Replace the in-memory API limiter with a shared limiter such as Redis when more than one application process is used.
4. Publish a privacy notice explaining that project descriptions may be sent to the user-selected model provider and that capability searches may be sent to GitHub.
5. Use a GitHub token restricted to public repository metadata. It must not grant private repository access.
6. Configure uptime, error-rate, API-cost, disk-space, and database backup monitoring.
7. Test database restore procedures and retain encrypted off-server backups.

## Secret Handling

- Never add a fallback database URL, API key, token, or password to source code.
- Rotate a credential immediately if it appears in Git history, logs, screenshots, or chat transcripts.
- Removing a secret from the latest commit is not enough. Rotate it first, then clean Git history in a coordinated maintenance window.
- Do not expose `SUPABASE_SERVICE_ROLE_KEY`, `GITHUB_TOKEN`, or `DATABASE_URL` to client components.
- Never persist a user model API key in PostgreSQL, application logs, analytics, error reporting, URLs, or shared caches.

## Vulnerability Reporting

Do not open a public issue containing exploit details or credentials. Contact the repository owner privately with:

- Affected route or component.
- Reproduction steps.
- Expected impact.
- Suggested mitigation.
