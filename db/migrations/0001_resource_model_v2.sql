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

create table if not exists public.resource_repositories (
  id uuid primary key default gen_random_uuid(),
  canonical_url text not null,
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
  updated_at timestamptz not null default now()
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
  updated_at timestamptz not null default now()
);

create table if not exists public.resource_verification_runs (
  id uuid primary key default gen_random_uuid(),
  artifact_id uuid not null references public.resource_artifacts(id) on delete cascade,
  run_key text not null,
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

create index if not exists resource_repositories_provider_idx
  on public.resource_repositories(provider);
create unique index if not exists resource_repositories_canonical_url_idx
  on public.resource_repositories(canonical_url);
create index if not exists resource_repositories_latest_commit_idx
  on public.resource_repositories(latest_commit_at desc);
create index if not exists resource_artifacts_legacy_resource_idx
  on public.resource_artifacts(legacy_resource_id);
create unique index if not exists resource_artifacts_repository_key_idx
  on public.resource_artifacts(repository_id, artifact_key);
create index if not exists resource_artifacts_kind_status_idx
  on public.resource_artifacts(kind, verification_status);
create index if not exists resource_artifacts_quality_idx
  on public.resource_artifacts(quality_score desc);
create index if not exists resource_evidence_artifact_idx
  on public.resource_evidence(artifact_id);
create unique index if not exists resource_evidence_artifact_key_idx
  on public.resource_evidence(artifact_id, evidence_key);
create index if not exists resource_evidence_kind_idx
  on public.resource_evidence(kind);
create index if not exists resource_verification_runs_artifact_idx
  on public.resource_verification_runs(artifact_id);
create unique index if not exists resource_verification_runs_run_key_idx
  on public.resource_verification_runs(run_key);
create index if not exists resource_verification_runs_status_idx
  on public.resource_verification_runs(status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

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

do $$ begin
  if exists (select 1 from pg_roles where rolname = 'agent_skill_hub_app') then
    grant select, insert, update, delete on table
      public.resource_repositories,
      public.resource_artifacts,
      public.resource_evidence,
      public.resource_verification_runs
    to agent_skill_hub_app;
  end if;
  if exists (select 1 from pg_roles where rolname = 'agent_skill_hub_sync') then
    grant select, insert, update, delete on table
      public.resource_repositories,
      public.resource_artifacts,
      public.resource_evidence,
      public.resource_verification_runs
    to agent_skill_hub_sync;
  end if;
end $$;
