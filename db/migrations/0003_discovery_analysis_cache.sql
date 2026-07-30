create table if not exists public.discovery_candidate_cache (
  repo_url text primary key,
  repository_full_name text not null,
  resource jsonb not null,
  project_tags text[] not null default '{}',
  capability_ids text[] not null default '{}',
  capability_context jsonb not null default '[]',
  search_queries text[] not null default '{}',
  verification_status text not null default 'verified'
    check (verification_status in ('verified', 'stale', 'rejected')),
  verification_score integer not null default 0
    check (verification_score between 0 and 100),
  failure_count integer not null default 0
    check (failure_count >= 0),
  last_error text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_verified_at timestamptz not null default now(),
  next_verification_at timestamptz not null default now() + interval '1 day',
  expires_at timestamptz not null default now() + interval '14 days',
  updated_at timestamptz not null default now()
);

create index if not exists discovery_candidate_cache_capability_ids_idx
  on public.discovery_candidate_cache using gin(capability_ids);
create index if not exists discovery_candidate_cache_project_tags_idx
  on public.discovery_candidate_cache using gin(project_tags);
create index if not exists discovery_candidate_cache_verification_idx
  on public.discovery_candidate_cache(verification_status, next_verification_at);
create index if not exists discovery_candidate_cache_expires_idx
  on public.discovery_candidate_cache(expires_at);

create table if not exists public.analysis_result_cache (
  prompt_hash text primary key,
  normalized_prompt text not null,
  result jsonb not null,
  cache_version text not null,
  hit_count integer not null default 0 check (hit_count >= 0),
  created_at timestamptz not null default now(),
  last_accessed_at timestamptz not null default now(),
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index if not exists analysis_result_cache_expires_idx
  on public.analysis_result_cache(expires_at);
create index if not exists analysis_result_cache_accessed_idx
  on public.analysis_result_cache(last_accessed_at);

drop trigger if exists discovery_candidate_cache_set_updated_at
  on public.discovery_candidate_cache;
create trigger discovery_candidate_cache_set_updated_at
before update on public.discovery_candidate_cache
for each row execute function public.set_updated_at();

drop trigger if exists analysis_result_cache_set_updated_at
  on public.analysis_result_cache;
create trigger analysis_result_cache_set_updated_at
before update on public.analysis_result_cache
for each row execute function public.set_updated_at();

do $$ begin
  if exists (select 1 from pg_roles where rolname = 'agent_skill_hub_app') then
    grant select, insert, update, delete on table
      public.discovery_candidate_cache,
      public.analysis_result_cache
    to agent_skill_hub_app;
  end if;
  if exists (select 1 from pg_roles where rolname = 'agent_skill_hub_sync') then
    grant select, insert, update, delete on table
      public.discovery_candidate_cache,
      public.analysis_result_cache
    to agent_skill_hub_sync;
  end if;
end $$;
