import dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import { syncResourceCatalog, type CatalogCandidate } from "../lib/resource-catalog-sync";
import { resourceTags, resources, tags } from "../lib/db/schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required.");

const client = postgres(databaseUrl);
const db = drizzle(client);

async function main() {
  const options = parseOptions(process.argv.slice(2));
  console.log(`Syncing resource catalog from: ${Array.from(options.sources).join(", ")}`);
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
        source: candidate.source,
        lastUpdated: candidate.last_updated,
        metadata,
        updatedAt: sql`now()`
      }
    })
    .returning({ id: resources.id });

  if (!savedResource) return;

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
}

function parseOptions(args: string[]) {
  const sourceArg = args.find((arg) => arg.startsWith("--source="))?.split("=")[1] ?? "all";
  const limitArg = Number(args.find((arg) => arg.startsWith("--limit="))?.split("=")[1] ?? process.env.RESOURCE_SYNC_LIMIT ?? 20);
  const mcpLimitArg = Number(args.find((arg) => arg.startsWith("--mcp-limit="))?.split("=")[1] ?? process.env.MCP_SYNC_LIMIT ?? 100);
  const available = new Set(["github", "mcp", "npm"] as const);
  const sources = sourceArg === "all"
    ? available
    : new Set(sourceArg.split(",").filter((source): source is "github" | "mcp" | "npm" => available.has(source as "github" | "mcp" | "npm")));

  if (sources.size === 0) throw new Error("--source must contain github, mcp, npm, or all.");
  return { limitPerQuery: clamp(limitArg, 1, 50), mcpLimit: clamp(mcpLimitArg, 1, 500), sources };
}

function clamp(value: number, min: number, max: number) {
  return Number.isFinite(value) ? Math.min(Math.max(value, min), max) : min;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-").replace(/^-+|-+$/g, "") || value;
}

void main().catch(async (error) => {
  console.error(error);
  await client.end();
  process.exitCode = 1;
});
