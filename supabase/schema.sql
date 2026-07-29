create extension if not exists vector;
create extension if not exists pgcrypto;

do $$ begin
  create type public.resource_type as enum (
    'agent_skill',
    'mcp_server',
    'github_plugin',
    'ui_component',
    'template_repo'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.risk_level as enum ('low', 'medium', 'high');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.repository_provider as enum ('github', 'npm', 'mcp_registry', 'manual');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.resource_artifact_kind as enum (
    'agent_skill',
    'mcp_server',
    'github_action',
    'github_app',
    'ui_library',
    'project_template',
    'library',
    'application',
    'dataset',
    'awesome_list',
    'developer_tool'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.artifact_verification_status as enum ('pending', 'verified', 'rejected', 'stale');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.resource_evidence_kind as enum (
    'type_declaration',
    'skill_manifest',
    'mcp_manifest',
    'package_manifest',
    'project_manifest',
    'github_action',
    'github_app',
    'readme_claim',
    'license',
    'maintenance',
    'popularity',
    'manual_review'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.verification_run_status as enum ('passed', 'failed', 'partial');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  type public.resource_type not null,
  description text not null,
  supported_agents text[] not null default '{}',
  install_command text not null default '',
  use_cases text[] not null default '{}',
  risk_level public.risk_level not null default 'medium',
  trust_score integer not null default 0 check (trust_score >= 0 and trust_score <= 100),
  fit_score integer not null default 0 check (fit_score >= 0 and fit_score <= 100),
  repo_url text not null default '',
  github_stars integer not null default 0,
  github_forks integer not null default 0,
  license text,
  latest_commit_at timestamptz,
  readme_summary text,
  has_skill_md boolean not null default false,
  has_package_json boolean not null default false,
  has_mcp_manifest boolean not null default false,
  source text not null default 'manual',
  last_updated date not null default current_date,
  embedding vector(1536),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.resources add column if not exists industry text;
alter table public.resources add column if not exists project_type text;
alter table public.resources add column if not exists frontend text;
alter table public.resources add column if not exists backend text;
alter table public.resources add column if not exists database_name text;
alter table public.resources add column if not exists orm text;
alter table public.resources add column if not exists deploy text;
alter table public.resources add column if not exists stack text[] not null default '{}';
alter table public.resources add column if not exists difficulty text;
alter table public.resources add column if not exists priority integer not null default 0;
alter table public.resources add column if not exists ai_recommendation_weight integer not null default 0;

alter table public.resources add column if not exists github_stars integer not null default 0;
alter table public.resources add column if not exists github_forks integer not null default 0;
alter table public.resources add column if not exists license text;
alter table public.resources add column if not exists latest_commit_at timestamptz;
alter table public.resources add column if not exists readme_summary text;
alter table public.resources add column if not exists has_skill_md boolean not null default false;
alter table public.resources add column if not exists has_package_json boolean not null default false;
alter table public.resources add column if not exists has_mcp_manifest boolean not null default false;

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  slug text unique not null,
  category text,
  created_at timestamptz not null default now()
);

create table if not exists public.resource_tags (
  resource_id uuid not null references public.resources(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (resource_id, tag_id)
);

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  name text not null,
  description text,
  resource_ids uuid[] not null default '{}',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  project_prompt text not null,
  normalized_requirements jsonb not null default '{}',
  recommended_resource_ids uuid[] not null default '{}',
  recommendation jsonb not null,
  codex_plan text,
  created_at timestamptz not null default now()
);

create table if not exists public.risk_reports (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  risk_level public.risk_level not null,
  security_score numeric(4,2),
  maintenance_score numeric(4,2),
  license_score numeric(4,2),
  compatibility_score numeric(4,2),
  summary text not null,
  signals jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.resource_repositories (
  id uuid primary key default gen_random_uuid(),
  canonical_url text unique not null,
  provider public.repository_provider not null,
  owner text,
  name text not null,
  description text,
  homepage_url text,
  default_branch text,
  license text,
  stars integer not null default 0 check (stars >= 0),
  forks integer not null default 0 check (forks >= 0),
  archived boolean not null default false,
  latest_commit_at timestamptz,
  metadata jsonb not null default '{}',
  first_seen_at timestamptz not null default now(),
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resource_artifacts (
  id uuid primary key default gen_random_uuid(),
  repository_id uuid not null references public.resource_repositories(id) on delete cascade,
  legacy_resource_id uuid references public.resources(id) on delete set null,
  artifact_key text not null,
  kind public.resource_artifact_kind not null,
  name text not null,
  description text not null,
  artifact_path text,
  package_name text,
  install_command text not null default '',
  verification_status public.artifact_verification_status not null default 'pending',
  type_confidence integer not null default 0 check (type_confidence between 0 and 100),
  trust_score integer not null default 0 check (trust_score between 0 and 100),
  quality_score integer not null default 0 check (quality_score between 0 and 100),
  risk_level public.risk_level not null default 'medium',
  metadata jsonb not null default '{}',
  published_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (repository_id, artifact_key)
);

create table if not exists public.resource_evidence (
  id uuid primary key default gen_random_uuid(),
  artifact_id uuid not null references public.resource_artifacts(id) on delete cascade,
  evidence_key text not null,
  kind public.resource_evidence_kind not null,
  source_url text,
  source_path text,
  summary text not null,
  confidence integer not null default 0 check (confidence between 0 and 100),
  payload jsonb not null default '{}',
  observed_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (artifact_id, evidence_key)
);

create table if not exists public.resource_verification_runs (
  id uuid primary key default gen_random_uuid(),
  artifact_id uuid not null references public.resource_artifacts(id) on delete cascade,
  run_key text unique not null,
  source text not null,
  status public.verification_run_status not null,
  classifier_version text not null,
  score integer not null default 0 check (score between 0 and 100),
  checks jsonb not null default '{}',
  error text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists resources_type_idx on public.resources(type);
create index if not exists resources_risk_level_idx on public.resources(risk_level);
create index if not exists resources_trust_score_idx on public.resources(trust_score desc);
create index if not exists resources_fit_score_idx on public.resources(fit_score desc);
create index if not exists resources_github_stars_idx on public.resources(github_stars desc);
create index if not exists resources_search_idx on public.resources using gin (
  to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(source, ''))
);
create index if not exists tags_slug_idx on public.tags(slug);
create index if not exists resource_tags_resource_idx on public.resource_tags(resource_id);
create index if not exists resource_tags_tag_idx on public.resource_tags(tag_id);
create index if not exists risk_reports_resource_idx on public.risk_reports(resource_id);
create index if not exists resource_repositories_provider_idx on public.resource_repositories(provider);
create index if not exists resource_repositories_latest_commit_idx on public.resource_repositories(latest_commit_at desc);
create index if not exists resource_artifacts_legacy_resource_idx on public.resource_artifacts(legacy_resource_id);
create index if not exists resource_artifacts_kind_status_idx on public.resource_artifacts(kind, verification_status);
create index if not exists resource_artifacts_quality_idx on public.resource_artifacts(quality_score desc);
create index if not exists resource_evidence_artifact_idx on public.resource_evidence(artifact_id);
create index if not exists resource_evidence_kind_idx on public.resource_evidence(kind);
create index if not exists resource_verification_runs_artifact_idx on public.resource_verification_runs(artifact_id);
create index if not exists resource_verification_runs_status_idx on public.resource_verification_runs(status);

create index if not exists resources_embedding_idx
  on public.resources using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists resources_set_updated_at on public.resources;
create trigger resources_set_updated_at
before update on public.resources
for each row execute function public.set_updated_at();

drop trigger if exists collections_set_updated_at on public.collections;
create trigger collections_set_updated_at
before update on public.collections
for each row execute function public.set_updated_at();

drop trigger if exists resource_repositories_set_updated_at on public.resource_repositories;
create trigger resource_repositories_set_updated_at
before update on public.resource_repositories
for each row execute function public.set_updated_at();

drop trigger if exists resource_artifacts_set_updated_at on public.resource_artifacts;
create trigger resource_artifacts_set_updated_at
before update on public.resource_artifacts
for each row execute function public.set_updated_at();

drop trigger if exists resource_evidence_set_updated_at on public.resource_evidence;
create trigger resource_evidence_set_updated_at
before update on public.resource_evidence
for each row execute function public.set_updated_at();

alter table public.resources enable row level security;
alter table public.tags enable row level security;
alter table public.resource_tags enable row level security;
alter table public.collections enable row level security;
alter table public.project_recommendations enable row level security;
alter table public.risk_reports enable row level security;
alter table public.resource_repositories enable row level security;
alter table public.resource_artifacts enable row level security;
alter table public.resource_evidence enable row level security;
alter table public.resource_verification_runs enable row level security;

drop policy if exists "Public resources are readable" on public.resources;
create policy "Public resources are readable"
on public.resources for select
using (true);

drop policy if exists "Public tags are readable" on public.tags;
create policy "Public tags are readable"
on public.tags for select
using (true);

drop policy if exists "Public resource tags are readable" on public.resource_tags;
create policy "Public resource tags are readable"
on public.resource_tags for select
using (true);

drop policy if exists "Public risk reports are readable" on public.risk_reports;
create policy "Public risk reports are readable"
on public.risk_reports for select
using (true);

drop policy if exists "Public verified repositories are readable" on public.resource_repositories;
create policy "Public verified repositories are readable"
on public.resource_repositories for select
using (
  exists (
    select 1
    from public.resource_artifacts
    where resource_artifacts.repository_id = resource_repositories.id
      and resource_artifacts.verification_status = 'verified'
  )
);

drop policy if exists "Public verified artifacts are readable" on public.resource_artifacts;
create policy "Public verified artifacts are readable"
on public.resource_artifacts for select
using (verification_status = 'verified');

drop policy if exists "Public verified evidence is readable" on public.resource_evidence;
create policy "Public verified evidence is readable"
on public.resource_evidence for select
using (
  exists (
    select 1
    from public.resource_artifacts
    where resource_artifacts.id = resource_evidence.artifact_id
      and resource_artifacts.verification_status = 'verified'
  )
);

create or replace function public.match_resources(
  query_embedding vector(1536),
  match_threshold float default 0.72,
  match_count int default 12
)
returns table (
  id uuid,
  slug text,
  name text,
  type public.resource_type,
  description text,
  similarity float
)
language sql stable
as $$
  select
    resources.id,
    resources.slug,
    resources.name,
    resources.type,
    resources.description,
    1 - (resources.embedding <=> query_embedding) as similarity
  from public.resources
  where resources.embedding is not null
    and 1 - (resources.embedding <=> query_embedding) > match_threshold
  order by resources.embedding <=> query_embedding
  limit match_count;
$$;
