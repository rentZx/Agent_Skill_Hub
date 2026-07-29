create table if not exists public.capability_definitions (
  id text primary key,
  label_zh text not null,
  description_zh text not null,
  domain text not null,
  resource_role text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.artifact_capabilities (
  artifact_id uuid not null references public.resource_artifacts(id) on delete cascade,
  capability_id text not null references public.capability_definitions(id) on delete cascade,
  confidence integer not null default 0 check (confidence between 0 and 100),
  coverage_level text not null default 'partial'
    check (coverage_level in ('full', 'partial', 'supporting')),
  source text not null,
  summary text not null,
  matched_terms text[] not null default '{}',
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (artifact_id, capability_id)
);

create index if not exists capability_definitions_domain_idx
  on public.capability_definitions(domain);
create index if not exists artifact_capabilities_capability_idx
  on public.artifact_capabilities(capability_id);
create index if not exists artifact_capabilities_confidence_idx
  on public.artifact_capabilities(confidence desc);

drop trigger if exists capability_definitions_set_updated_at on public.capability_definitions;
create trigger capability_definitions_set_updated_at
before update on public.capability_definitions
for each row execute function public.set_updated_at();

drop trigger if exists artifact_capabilities_set_updated_at on public.artifact_capabilities;
create trigger artifact_capabilities_set_updated_at
before update on public.artifact_capabilities
for each row execute function public.set_updated_at();

do $$ begin
  if exists (select 1 from pg_roles where rolname = 'agent_skill_hub_app') then
    grant select on table
      public.capability_definitions,
      public.artifact_capabilities
    to agent_skill_hub_app;
  end if;
  if exists (select 1 from pg_roles where rolname = 'agent_skill_hub_sync') then
    grant select, insert, update, delete on table
      public.capability_definitions,
      public.artifact_capabilities
    to agent_skill_hub_sync;
  end if;
end $$;
