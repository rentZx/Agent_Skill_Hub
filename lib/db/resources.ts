import "server-only";

import { desc, eq, or, sql } from "drizzle-orm";
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
  const db = getDb();
  if (!db) throw new Error("DATABASE_URL is not configured.");

  const condition = uuidPattern.test(id)
    ? or(eq(resources.slug, id), eq(resources.id, id))
    : eq(resources.slug, id);
  const rows = await db
    .select({
      resource: resources,
      tagSlug: tags.slug,
      tagName: tags.name
    })
    .from(resources)
    .leftJoin(resourceTags, eq(resourceTags.resourceId, resources.id))
    .leftJoin(tags, eq(tags.id, resourceTags.tagId))
    .where(condition);

  return mapJoinedResources(rows)[0] ?? null;
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
          risk_reason: resource.risk_reason,
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
            risk_reason: resource.risk_reason,
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
        risk_reason: getMetadataRiskReason(row.resource.metadata),
        trust_score: row.resource.trustScore,
        fit_score: row.resource.fitScore,
        repo_url: row.resource.repoUrl,
        github_stars: row.resource.githubStars,
        github_forks: row.resource.githubForks,
        license: row.resource.license,
        latest_commit_at: row.resource.latestCommitAt?.toISOString() ?? null,
        readme_summary: row.resource.readmeSummary ?? undefined,
        has_skill_md: row.resource.hasSkillMd,
        has_package_json: row.resource.hasPackageJson,
        has_mcp_manifest: row.resource.hasMcpManifest,
        evidence_summary: buildEvidenceSummary(row.resource),
        source: row.resource.source,
        last_updated: normalizeDate(row.resource.lastUpdated),
        last_synced_at: getMetadataSyncTime(row.resource.metadata) ?? normalizeDateTime(row.resource.updatedAt)
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

function normalizeDateTime(value: Date) {
  return value.toISOString();
}

function parseOptionalDate(value: string | null) {
  return value ? new Date(value) : null;
}

function getMetadataRiskReason(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || !("risk_reason" in metadata)) {
    return undefined;
  }

  const reason = (metadata as { risk_reason?: unknown }).risk_reason;
  return typeof reason === "string" && reason.length > 0 ? reason : undefined;
}

function getMetadataSyncTime(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || !("synced_at" in metadata)) {
    return undefined;
  }

  const value = (metadata as { synced_at?: unknown }).synced_at;
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function buildEvidenceSummary(resource: ResourceRow) {
  const evidence = [
    resource.hasSkillMd ? "已发现 SKILL.md" : "",
    resource.hasMcpManifest ? "已发现 MCP Registry 或 Manifest" : "",
    resource.hasPackageJson ? "已发现 npm/package.json 包信息" : "",
    resource.license ? `许可证 ${resource.license}` : "",
    resource.githubStars > 0 ? `GitHub Stars ${resource.githubStars}` : ""
  ].filter(Boolean);

  return evidence.length > 0 ? evidence.join("；") : undefined;
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
