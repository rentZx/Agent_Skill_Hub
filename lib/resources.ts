import "server-only";

import { seedResources } from "@/data/seed-resources";
import { listResources } from "@/lib/db/resources";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Resource } from "@/lib/types";

type ResourceQueryRow = Resource & {
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
  return seedResources.map((resource, index) => ({
    ...resource,
    id: `seed-${index + 1}`,
    slug: slugify(resource.name)
  }));
}

export async function getResources(): Promise<Resource[]> {
  if (process.env.DATABASE_URL) {
    try {
      return await listResources();
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
      source,
      last_updated,
      resource_tags(tags(name, slug))
    `
    )
    .order("fit_score", { ascending: false })
    .order("trust_score", { ascending: false });

  if (error || !data) {
    return getSeedResources();
  }

  return (data as unknown as ResourceQueryRow[]).map((resource) => {
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
      source: resource.source,
      last_updated: resource.last_updated
    };
  });
}

export async function getResourceBySlug(slug: string): Promise<Resource | null> {
  const resources = await getResources();
  return resources.find((resource) => resource.slug === slug || resource.id === slug) ?? null;
}
