# Agent Skill Hub Plan

## V1.0 Product Goal

V1.0 should deliver a usable AI development stack navigator. A user can describe a project, search and filter available resources, inspect resource risk and compatibility, save useful resources, and generate a structured development combination plan for Codex.

The V1.0 product should prioritize correctness, clarity, and trust over breadth. The first release can use curated/mock resource data before full automation is connected.

## Page List

1. Home
   - Project requirement input.
   - Popular categories.
   - Popular Skills.
   - Popular MCP Servers.
   - Entry point to recommendation generation.

2. Search
   - Keyword search.
   - Type filter.
   - Compatible tool filter.
   - Risk level filter.
   - Result cards with install command, quality score, popularity, and risk.

3. Resource Detail
   - Resource overview.
   - Use cases.
   - Installation command.
   - Compatible tools.
   - GitHub metadata.
   - Risk analysis.
   - Recommended companion resources.

4. Project Recommendation
   - Project description input.
   - Recommended resource stack.
   - Implementation order.
   - Codex-ready development prompt.

5. Favorites
   - Saved resources.
   - Grouping by resource type.
   - Future export entry.

6. Admin
   - Add resource manually.
   - Edit resource fields.
   - Manage tags, compatible tools, and risk level.
   - Import one GitHub repository URL, preview parsed metadata, and save confirmed resources.

## Data Table Design

### resources

Stores all resource types in one unified table.

- `id uuid primary key`
- `slug text unique not null`
- `name text not null`
- `type resource_type not null`
- `description text not null`
- `supported_agents text[] default '{}'`
- `install_command text default ''`
- `use_cases text[] default '{}'`
- `risk_level risk_level default 'medium'`
- `trust_score integer default 0`
- `fit_score integer default 0`
- `repo_url text default ''`
- `github_stars integer default 0`
- `github_forks integer default 0`
- `license text`
- `latest_commit_at timestamptz`
- `readme_summary text`
- `has_skill_md boolean default false`
- `has_package_json boolean default false`
- `has_mcp_manifest boolean default false`
- `source text default 'manual'`
- `last_updated date default current_date`
- `embedding vector(1536)`
- `metadata jsonb default '{}'`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

### tags

- `id uuid primary key`
- `name text unique not null`
- `slug text unique not null`
- `category text`
- `created_at timestamptz default now()`

### resource_tags

- `resource_id uuid references resources(id) on delete cascade`
- `tag_id uuid references tags(id) on delete cascade`
- `primary key(resource_id, tag_id)`

### collections

- `id uuid primary key`
- `user_id uuid`
- `name text not null`
- `description text`
- `resource_ids uuid[] default '{}'`
- `is_default boolean default false`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

### project_recommendations

- `id uuid primary key`
- `user_id uuid`
- `project_prompt text not null`
- `normalized_requirements jsonb default '{}'`
- `recommended_resource_ids uuid[] default '{}'`
- `recommendation jsonb not null`
- `codex_plan text`
- `created_at timestamptz default now()`

### risk_reports

- `id uuid primary key`
- `resource_id uuid references resources(id) on delete cascade`
- `risk_level risk_level not null`
- `security_score numeric(4,2)`
- `maintenance_score numeric(4,2)`
- `license_score numeric(4,2)`
- `compatibility_score numeric(4,2)`
- `summary text not null`
- `signals jsonb default '{}'`
- `created_at timestamptz default now()`

## Development Milestones

### Milestone 1: Stabilize the App Shell

- Fix current build blockers.
- Add root home page.
- Add app shell navigation.
- Align project naming to Agent Skill Hub.
- Verify `npm run build`.

### Milestone 2: Build Core UI Pages

- Implement Home, Search, Resource Detail, Recommendation, Favorites, and Admin pages.
- Add shadcn/ui style base components.
- Add responsive dark AI SaaS visual system.
- Use local mock data for all views.

### Milestone 3: Add Resource Data Layer

- Add shared TypeScript types.
- Add mock resource dataset.
- Add search/filter utilities.
- Add recommendation composition logic.

### Milestone 4: Add Supabase Foundation

- Create `supabase/schema.sql`. Done.
- Create `supabase/seed.sql` from curated V1.0 seed data. Done.
- Add Supabase server client with seed fallback. Done.
- Add environment variable documentation.
- Prepare pgvector indexes and similarity search function.

### Milestone 5: Recommendation Engine V1

- Parse project descriptions into requirements. Done with rule-based keyword extraction.
- Select resource combinations by type coverage, compatibility, score, and risk. Done for V1 rule matching.
- Generate a Codex-ready development prompt. Done.
- Save recommendation records when Supabase is configured.

## Acceptance Criteria

V1.0 is acceptable when:

- `npm install` succeeds from a clean checkout.
- `npm run dev` starts the app locally.
- `npm run build` completes successfully.
- All six V1.0 pages are reachable.
- Search filters resources by keyword, type, tool, and risk level.
- Resource detail pages show install command, compatibility, GitHub metadata, and risk analysis.
- Project Recommendation page returns a structured stack with Skills, MCP Servers, GitHub AI plugins, UI libraries, and template repositories.
- The generated Codex plan is clear enough to paste into a new Codex thread.
- Supabase schema exists and matches the documented tables.
- Existing pages remain visually intact after changes.
