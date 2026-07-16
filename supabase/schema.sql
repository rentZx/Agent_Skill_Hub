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

alter table public.resources enable row level security;
alter table public.tags enable row level security;
alter table public.resource_tags enable row level security;
alter table public.collections enable row level security;
alter table public.project_recommendations enable row level security;
alter table public.risk_reports enable row level security;

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
