import "server-only";

import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { resourceTags, resources, tags } from "@/lib/db/schema";
import type { GitHubParsedResource } from "@/lib/github-import";
import type { Resource, ResourceType, RiskLevel } from "@/lib/types";

type ResourceRow = typeof resources.$inferSelect;

export async function listResources(): Promise<Resource[]> {
  const db = getDb();

  if (!db) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const rows = await db
    .select({
      resource: resources,
      tagSlug: tags.slug,
      tagName: tags.name
    })
    .from(resources)
    .leftJoin(resourceTags, eq(resourceTags.resourceId, resources.id))
    .leftJoin(tags, eq(tags.id, resourceTags.tagId))
    .orderBy(desc(resources.fitScore), desc(resources.trustScore));

  return mapJoinedResources(rows);
}

export async function getResourceById(id: string): Promise<Resource | null> {
  const allResources = await listResources();
  return allResources.find((resource) => resource.id === id || resource.slug === id) ?? null;
}

export async function importResourceWithTags(resource: GitHubParsedResource) {
  const db = getDb();

  if (!db) {
    throw new Error("未配置 DATABASE_URL，无法写入 PostgreSQL。");
  }

  const slug = slugifyResource(resource.name);

  return db.transaction(async (tx) => {
    const [savedResource] = await tx
      .insert(resources)
      .values({
        slug,
        name: resource.name,
        type: resource.type,
        description: resource.description,
        supportedAgents: resource.supported_agents,
        installCommand: resource.install_command,
        useCases: resource.use_cases,
        riskLevel: resource.risk_level,
        trustScore: resource.trust_score,
        fitScore: resource.fit_score,
        repoUrl: resource.repo_url,
        githubStars: resource.github.stars,
        githubForks: resource.github.forks,
        license: resource.github.license,
        latestCommitAt: parseOptionalDate(resource.github.latest_commit_time),
        readmeSummary: resource.readme_summary,
        hasSkillMd: resource.github.has_skill_md,
        hasPackageJson: resource.github.has_package_json,
        hasMcpManifest: resource.github.has_mcp_manifest,
        source: resource.source,
        lastUpdated: resource.last_updated,
        metadata: {
          github: resource.github,
          imported_at: new Date().toISOString()
        }
      })
      .onConflictDoUpdate({
        target: resources.slug,
        set: {
          name: resource.name,
          type: resource.type,
          description: resource.description,
          supportedAgents: resource.supported_agents,
          installCommand: resource.install_command,
          useCases: resource.use_cases,
          riskLevel: resource.risk_level,
          trustScore: resource.trust_score,
          fitScore: resource.fit_score,
          repoUrl: resource.repo_url,
          githubStars: resource.github.stars,
          githubForks: resource.github.forks,
          license: resource.github.license,
          latestCommitAt: parseOptionalDate(resource.github.latest_commit_time),
          readmeSummary: resource.readme_summary,
          hasSkillMd: resource.github.has_skill_md,
          hasPackageJson: resource.github.has_package_json,
          hasMcpManifest: resource.github.has_mcp_manifest,
          source: resource.source,
          lastUpdated: resource.last_updated,
          metadata: {
            github: resource.github,
            imported_at: new Date().toISOString()
          },
          updatedAt: sql`now()`
        }
      })
      .returning({ id: resources.id, slug: resources.slug });

    if (!savedResource) {
      throw new Error("保存资源失败。");
    }

    for (const tag of resource.tags) {
      const tagSlug = slugifyTag(tag);
      const [savedTag] = await tx
        .insert(tags)
        .values({
          slug: tagSlug,
          name: tag,
          category: "github_import"
        })
        .onConflictDoUpdate({
          target: tags.slug,
          set: {
            name: tag,
            category: "github_import"
          }
        })
        .returning({ id: tags.id });

      if (!savedTag) {
        throw new Error(`保存标签失败：${tag}`);
      }

      await tx
        .insert(resourceTags)
        .values({
          resourceId: savedResource.id,
          tagId: savedTag.id
        })
        .onConflictDoNothing({
          target: [resourceTags.resourceId, resourceTags.tagId]
        });
    }

    return savedResource;
  });
}

function mapJoinedResources(
  rows: Array<{
    resource: ResourceRow;
    tagSlug: string | null;
    tagName: string | null;
  }>
) {
  const resourceMap = new Map<string, Resource>();

  for (const row of rows) {
    const existing = resourceMap.get(row.resource.id);

    if (!existing) {
      resourceMap.set(row.resource.id, {
        id: row.resource.id,
        slug: row.resource.slug,
        name: row.resource.name,
        type: row.resource.type as ResourceType,
        description: row.resource.description,
        tags: [],
        supported_agents: row.resource.supportedAgents,
        install_command: row.resource.installCommand,
        use_cases: row.resource.useCases,
        risk_level: row.resource.riskLevel as RiskLevel,
        trust_score: row.resource.trustScore,
        fit_score: row.resource.fitScore,
        repo_url: row.resource.repoUrl,
        source: row.resource.source,
        last_updated: normalizeDate(row.resource.lastUpdated)
      });
    }

    const mappedResource = resourceMap.get(row.resource.id);
    const tag = row.tagSlug ?? row.tagName;

    if (mappedResource && tag && !mappedResource.tags.includes(tag)) {
      mappedResource.tags.push(tag);
    }
  }

  return Array.from(resourceMap.values());
}

function normalizeDate(value: string | Date) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value;
}

function parseOptionalDate(value: string | null) {
  return value ? new Date(value) : null;
}

function slugifyResource(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function slugifyTag(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || value;
}
