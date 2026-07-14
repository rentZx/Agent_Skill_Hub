# Agent Skill Hub Agent Rules

This file defines the working rules for Codex and other AI agents contributing to Agent Skill Hub.

## Required Reading

Before each development task:

1. Read `PLAN.md`.
2. Check the current project structure.
3. Confirm whether the task is documentation, design, implementation, debugging, or review.
4. Avoid changing unrelated files.

## Codex Development Rules

- Do not start broad rewrites unless the user explicitly asks for one.
- Prefer small, reviewable changes.
- Preserve existing behavior and visual structure unless the task requires changing it.
- After each code change, check whether existing pages, routes, or shared components were broken.
- Run relevant verification commands after implementation when practical.
- If a command fails, report the failure and the likely cause.
- Do not hide build, lint, dependency, or security warnings.
- Do not commit, push, or publish unless the user asks.

## UI Style Rules

Agent Skill Hub should feel like a premium, restrained AI SaaS product.

- Use a dark technology-forward interface.
- Prefer dense, structured layouts over marketing-style hero pages.
- Use glass-like panels sparingly and consistently.
- Use subtle gradients, grid backgrounds, and hover motion without visual noise.
- Keep information hierarchy clear.
- Use Bento Grid patterns where they improve scanning.
- Keep cards compact, aligned, and easy to compare.
- Use shadcn/ui as the base component style.
- Aceternity UI and React Bits style references are allowed as inspiration, but avoid copying heavy decorative patterns without product value.
- Do not introduce playful, loud, or overly colorful visual themes.
- Do not add visible instructional text that explains the UI instead of making the UI clear.

## Code Style Rules

- Use TypeScript for application code.
- Keep types in shared files when they are reused.
- Prefer clear names over clever abstractions.
- Prefer server components unless interactivity requires client components.
- Keep client components focused and intentional.
- Use Tailwind utility classes consistently.
- Use a `cn` helper for conditional class names once the shared utility exists.
- Keep data access logic separate from presentation components.
- Avoid duplicating resource filtering or recommendation logic inside pages.
- Add comments only when they explain non-obvious decisions.

## Dependency Rules

- Do not casually introduce heavy dependencies.
- Before adding a dependency, check whether the same result can be achieved with existing stack or small local code.
- Acceptable dependency categories for V1.0:
  - shadcn/ui and Radix primitives.
  - Motion for interaction animation.
  - Supabase client.
  - Small utility packages already present in the project.
- Avoid adding charting, table, state management, form, or animation libraries unless the product need is clear.
- Avoid adding backend frameworks beyond Next.js route handlers and Supabase for V1.0.

## Supabase Rules

- Do not expose service role keys in client components.
- Keep browser-safe Supabase access separate from server-only access.
- Schema changes must be reflected in `PLAN.md` and `supabase/schema.sql`.
- pgvector usage should support resource recommendation and semantic search, not arbitrary unrelated features.

## Verification Rules

After modifying code:

- Check affected routes still compile.
- Run `npm run build` when the change touches routing, layout, config, or shared components.
- Check responsive layout for major UI pages when visual components change.
- Confirm no new page depends on missing environment variables unless it has a safe fallback.

After modifying documentation only:

- Ensure instructions match the current project state.
- Do not claim unfinished features are complete.
- Keep README, PLAN, and AGENTS consistent with each other.

## Non-Goals For V1.0

- No marketplace payments.
- No team permissions beyond basic future-ready data fields.
- No automated GitHub crawling unless explicitly planned.
- No full auth-gated workflow until the anonymous MVP is stable.
- No complex AI agent orchestration before search, details, and recommendation flow are usable.
