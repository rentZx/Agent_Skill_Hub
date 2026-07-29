import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "../lib/db/schema";
import { resourceTags, resources, tags } from "../lib/db/schema";
import { upsertResourceModelV2 } from "../lib/db/resource-model-v2-write";
import { buildResourceModelV2 } from "../lib/resource-model-v2";
import type { ResourceType, RiskLevel } from "../lib/types";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required.");

const client = postgres(databaseUrl, { max: 3, prepare: false });
const db = drizzle(client, { schema });

async function main() {
  const rows = await db
    .select({
      resource: resources,
      tag: tags.slug
    })
    .from(resources)
    .leftJoin(resourceTags, eq(resourceTags.resourceId, resources.id))
    .leftJoin(tags, eq(tags.id, resourceTags.tagId));
  const grouped = new Map<string, {
    resource: typeof resources.$inferSelect;
    tags: string[];
  }>();

  for (const row of rows) {
    const entry = grouped.get(row.resource.id) ?? { resource: row.resource, tags: [] };
    if (row.tag && !entry.tags.includes(row.tag)) entry.tags.push(row.tag);
    grouped.set(row.resource.id, entry);
  }

  let processed = 0;
  for (const { resource, tags: resourceTagList } of grouped.values()) {
    const metadata = asMetadata(resource.metadata);
    const observedAt = resource.updatedAt;
    const model = buildResourceModelV2({
      legacyResourceId: resource.id,
      slug: resource.slug,
      name: resource.name,
      type: resource.type as ResourceType,
      description: resource.description,
      repoUrl: resource.repoUrl,
      installCommand: resource.installCommand,
      source: resource.source,
      riskLevel: resource.riskLevel as RiskLevel,
      trustScore: resource.trustScore,
      fitScore: resource.fitScore,
      githubStars: resource.githubStars,
      githubForks: resource.githubForks,
      license: resource.license,
      latestCommitAt: resource.latestCommitAt,
      artifactPath: getString(metadata, "skill_path"),
      packageName: getString(metadata, "package_name"),
      hasSkillMd: resource.hasSkillMd,
      hasMcpManifest: resource.hasMcpManifest,
      hasPackageJson: resource.hasPackageJson,
      hasProjectManifest: getBoolean(metadata, "has_project_manifest"),
      hasGithubAction: getBoolean(metadata, "has_github_action"),
      hasGithubApp: getBoolean(metadata, "has_github_app"),
      isCurated: resource.source === "curated_seed"
        || resource.source === "benchmark"
        || getBoolean(metadata, "is_curated_anchor") === true,
      tags: resourceTagList,
      metadata,
      observedAt,
      runKey: `resource-model-v2-backfill:${resource.id}`,
      runSource: "legacy_backfill"
    });

    await upsertResourceModelV2(db, model);
    processed += 1;
    if (processed % 100 === 0) console.log(`Backfilled ${processed}/${grouped.size} resources.`);
  }

  const [counts] = await client`
    select
      (select count(*)::int from resource_repositories) as repositories,
      (select count(*)::int from resource_artifacts) as artifacts,
      (select count(*)::int from resource_evidence) as evidence,
      (select count(*)::int from resource_verification_runs) as verification_runs
  `;
  console.log(`Resource model V2 backfill completed: ${JSON.stringify(counts)}`);
}

function asMetadata(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function getString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function getBoolean(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "boolean" ? value : undefined;
}

void main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end();
  });
