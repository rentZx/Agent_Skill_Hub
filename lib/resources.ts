import "server-only";

import { seedResources } from "@/data/seed-resources";
import { getResourceById, listResources } from "@/lib/db/resources";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mergeCanonicalResources } from "@/lib/resource-verification";
import type { Resource } from "@/lib/types";

type ResourceQueryRow = Resource & {
  metadata?: {
    risk_reason?: unknown;
    synced_at?: unknown;
    skill_path?: unknown;
    is_curated_anchor?: unknown;
    has_project_manifest?: unknown;
    has_github_action?: unknown;
  };
  resource_tags?: Array<{
    tags: { name: string; slug: string } | null;
  }>;
};

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getSeedResources(): Resource[] {
  return mergeCanonicalResources(seedResources.map((resource, index) => ({
    ...resource,
    id: `seed-${index + 1}`,
    slug: slugify(resource.name)
  })));
}

export async function getResources(): Promise<Resource[]> {
  if (process.env.DATABASE_URL) {
    try {
      return mergeCanonicalResources(await listResources());
    } catch (error) {
      console.warn("PostgreSQL resource read failed, falling back.", error);
    }
  }

  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return getSeedResources();
  }

  const { data, error } = await supabase
    .from("resources")
    .select(
      `
      id,
      slug,
      name,
      type,
      description,
      supported_agents,
      install_command,
      use_cases,
      risk_level,
      trust_score,
      fit_score,
      repo_url,
      github_stars,
      github_forks,
      has_skill_md,
      has_package_json,
      has_mcp_manifest,
      source,
      last_updated,
      metadata,
      resource_tags(tags(name, slug))
    `
    )
    .order("fit_score", { ascending: false })
    .order("trust_score", { ascending: false });

  if (error || !data) {
    return getSeedResources();
  }

  return mergeCanonicalResources((data as unknown as ResourceQueryRow[]).map((resource) => {
    const tagRows = resource.resource_tags ?? [];

    return {
      id: resource.id,
      slug: resource.slug,
      name: resource.name,
      type: resource.type,
      description: resource.description,
      tags: tagRows.map((row) => row.tags?.slug ?? row.tags?.name).filter(Boolean) as string[],
      supported_agents: resource.supported_agents,
      install_command: resource.install_command,
      use_cases: resource.use_cases,
      risk_level: resource.risk_level,
      trust_score: resource.trust_score,
      fit_score: resource.fit_score,
      repo_url: resource.repo_url,
      github_stars: resource.github_stars,
      github_forks: resource.github_forks,
      has_skill_md: resource.has_skill_md,
      has_package_json: resource.has_package_json,
      has_mcp_manifest: resource.has_mcp_manifest,
      has_project_manifest: getMetadataBoolean(resource.metadata, "has_project_manifest"),
      has_github_action: getMetadataBoolean(resource.metadata, "has_github_action"),
      artifact_path: getMetadataString(resource.metadata, "skill_path"),
      is_curated: getMetadataBoolean(resource.metadata, "is_curated_anchor"),
      source: resource.source,
      last_updated: resource.last_updated,
      last_synced_at: getMetadataSyncTime(resource.metadata),
      risk_reason: typeof resource.metadata?.risk_reason === "string" ? resource.metadata.risk_reason : undefined
    };
  }));
}

function getMetadataSyncTime(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || !("synced_at" in metadata)) {
    return undefined;
  }

  const value = (metadata as { synced_at?: unknown }).synced_at;
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function getMetadataString(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object" || !(key in metadata)) return undefined;
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function getMetadataBoolean(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object" || !(key in metadata)) return undefined;
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "boolean" ? value : undefined;
}

export async function getResourceBySlug(slug: string): Promise<Resource | null> {
  if (process.env.DATABASE_URL) {
    try {
      return await getResourceById(slug);
    } catch (error) {
      console.warn("PostgreSQL resource detail read failed, falling back.", error);
    }
  }

  const resources = await getResources();
  return resources.find((resource) => resource.slug === slug || resource.id === slug) ?? null;
}
