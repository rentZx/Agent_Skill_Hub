import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, sql } from "drizzle-orm";
import { syncResourceCatalog, type CatalogCandidate } from "../lib/resource-catalog-sync";
import { upsertResourceModelV2 } from "../lib/db/resource-model-v2-write";
import {
  replaceArtifactCapabilities,
  syncCapabilityDefinitions
} from "../lib/db/resource-capability-write";
import * as schema from "../lib/db/schema";
import { resourceTags, resources, tags } from "../lib/db/schema";
import { buildResourceModelV2 } from "../lib/resource-model-v2";
import { extractResourceCapabilities } from "../lib/resource-capabilities";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required.");

const client = postgres(databaseUrl);
const db = drizzle(client, { schema });

async function main() {
  const options = parseOptions(process.argv.slice(2));
  console.log(`Syncing resource catalog from: ${Array.from(options.sources).join(", ")}`);
  await syncCapabilityDefinitions(db);
  const candidates = await syncResourceCatalog(options);
  let saved = 0;

  for (const candidate of candidates) {
    await upsertCandidate(candidate);
    saved += 1;
  }

  await client.end();
  console.log(`Synced ${saved} resources from ${candidates.length} normalized candidates.`);
}

async function upsertCandidate(candidate: CatalogCandidate) {
  const metadata = {
    ...candidate.metadata,
    risk_reason: candidate.risk_reason,
    synced_at: new Date().toISOString()
  };
  const [savedResource] = await db
    .insert(resources)
    .values({
      slug: candidate.slug,
      name: candidate.name,
      type: candidate.type,
      description: candidate.description,
      supportedAgents: candidate.supported_agents,
      installCommand: candidate.install_command,
      useCases: candidate.use_cases,
      riskLevel: candidate.risk_level,
      trustScore: candidate.trust_score,
      fitScore: candidate.fit_score,
      repoUrl: candidate.repo_url,
      githubStars: candidate.github_stars ?? 0,
      githubForks: candidate.github_forks ?? 0,
      license: candidate.license ?? null,
      latestCommitAt: candidate.latest_commit_at ? new Date(candidate.latest_commit_at) : null,
      readmeSummary: candidate.readme_summary ?? candidate.description,
      hasSkillMd: candidate.has_skill_md ?? false,
      hasPackageJson: candidate.has_package_json ?? false,
      hasMcpManifest: candidate.has_mcp_manifest ?? false,
      source: candidate.source,
      lastUpdated: candidate.last_updated,
      metadata
    })
    .onConflictDoUpdate({
      target: resources.slug,
      set: {
        name: candidate.name,
        type: candidate.type,
        description: candidate.description,
        supportedAgents: candidate.supported_agents,
        installCommand: candidate.install_command,
        useCases: candidate.use_cases,
        riskLevel: candidate.risk_level,
        trustScore: candidate.trust_score,
        fitScore: candidate.fit_score,
        repoUrl: candidate.repo_url,
        githubStars: candidate.github_stars ?? 0,
        githubForks: candidate.github_forks ?? 0,
        license: candidate.license ?? null,
        latestCommitAt: candidate.latest_commit_at ? new Date(candidate.latest_commit_at) : null,
        readmeSummary: candidate.readme_summary ?? candidate.description,
        hasSkillMd: candidate.has_skill_md ?? false,
        hasPackageJson: candidate.has_package_json ?? false,
        hasMcpManifest: candidate.has_mcp_manifest ?? false,
        source: candidate.source,
        lastUpdated: candidate.last_updated,
        metadata,
        updatedAt: sql`now()`
      }
    })
    .returning({ id: resources.id });

  if (!savedResource) return;

  await db.delete(resourceTags).where(eq(resourceTags.resourceId, savedResource.id));

  for (const tag of candidate.tags) {
    const [savedTag] = await db
      .insert(tags)
      .values({ slug: slugify(tag), name: tag, category: candidate.source })
      .onConflictDoUpdate({ target: tags.slug, set: { name: tag, category: candidate.source } })
      .returning({ id: tags.id });

    if (!savedTag) continue;
    await db
      .insert(resourceTags)
      .values({ resourceId: savedResource.id, tagId: savedTag.id })
      .onConflictDoNothing({ target: [resourceTags.resourceId, resourceTags.tagId] });
  }

  const observedAt = typeof metadata.synced_at === "string" ? metadata.synced_at : new Date().toISOString();
  const savedModel = await upsertResourceModelV2(db, buildResourceModelV2({
    legacyResourceId: savedResource.id,
    slug: candidate.slug,
    name: candidate.name,
    type: candidate.type,
    description: candidate.description,
    repoUrl: candidate.repo_url,
    installCommand: candidate.install_command,
    source: candidate.source,
    riskLevel: candidate.risk_level,
    trustScore: candidate.trust_score,
    fitScore: candidate.fit_score,
    githubStars: candidate.github_stars ?? 0,
    githubForks: candidate.github_forks ?? 0,
    license: candidate.license,
    latestCommitAt: candidate.latest_commit_at,
    artifactPath: candidate.artifact_path ?? getMetadataString(metadata, "skill_path"),
    packageName: getMetadataString(metadata, "package_name"),
    hasSkillMd: candidate.has_skill_md,
    hasMcpManifest: candidate.has_mcp_manifest,
    hasPackageJson: candidate.has_package_json,
    hasProjectManifest: candidate.has_project_manifest ?? getMetadataBoolean(metadata, "has_project_manifest"),
    hasGithubAction: candidate.has_github_action ?? getMetadataBoolean(metadata, "has_github_action"),
    hasGithubApp: getMetadataBoolean(metadata, "has_github_app"),
    hasDatasetManifest: getMetadataBoolean(metadata, "has_dataset_manifest"),
    isCurated: candidate.is_curated
      ?? getMetadataBoolean(metadata, "is_curated_anchor")
      ?? candidate.source === "curated_seed",
    tags: candidate.tags,
    supportedAgents: candidate.supported_agents,
    useCases: candidate.use_cases,
    metadata,
    observedAt,
    runKey: `resource-model-v2-catalog-sync:${savedResource.id}:${observedAt}`,
    runSource: candidate.source
  }));

  const capabilityMatches = extractResourceCapabilities({
    name: candidate.name,
    description: candidate.description,
    tags: candidate.tags,
    readme: candidate.readme_summary
  });
  await replaceArtifactCapabilities(
    db,
    savedModel.artifactId,
    capabilityMatches,
    `catalog_sync:${candidate.source}`,
    new Date(observedAt)
  );
}

function parseOptions(args: string[]) {
  const sourceArg = args.find((arg) => arg.startsWith("--source="))?.split("=")[1] ?? "all";
  const limitArg = Number(args.find((arg) => arg.startsWith("--limit="))?.split("=")[1] ?? process.env.RESOURCE_SYNC_LIMIT ?? 20);
  const mcpLimitArg = Number(args.find((arg) => arg.startsWith("--mcp-limit="))?.split("=")[1] ?? process.env.MCP_SYNC_LIMIT ?? 100);
  const skillLimitArg = Number(args.find((arg) => arg.startsWith("--skills-limit="))?.split("=")[1] ?? process.env.SKILLS_SYNC_LIMIT ?? 100);
  const available = new Set(["github", "mcp", "npm"] as const);
  const sources = sourceArg === "all"
    ? available
    : new Set(sourceArg.split(",").filter((source): source is "github" | "mcp" | "npm" => available.has(source as "github" | "mcp" | "npm")));

  if (sources.size === 0) throw new Error("--source must contain github, mcp, npm, or all.");
  return { limitPerQuery: clamp(limitArg, 1, 50), mcpLimit: clamp(mcpLimitArg, 1, 500), skillLimit: clamp(skillLimitArg, 1, 500), sources };
}

function clamp(value: number, min: number, max: number) {
  return Number.isFinite(value) ? Math.min(Math.max(value, min), max) : min;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-").replace(/^-+|-+$/g, "") || value;
}

function getMetadataString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function getMetadataBoolean(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "boolean" ? value : undefined;
}

void main().catch(async (error) => {
  console.error(error);
  await client.end();
  process.exitCode = 1;
});
