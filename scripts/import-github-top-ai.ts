import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import { discoverTopAiResources } from "../lib/github-discovery";
import { resourceTags, resources, tags } from "../lib/db/schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required.");

const client = postgres(databaseUrl);
const db = drizzle(client);

async function main() {
  const discovered = await discoverTopAiResources(30);

  for (const resource of discovered) {
  const [saved] = await db.insert(resources).values({
    slug: resource.slug,
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
    githubStars: resource.github_stars ?? 0,
    githubForks: resource.github_forks ?? 0,
    license: resource.license ?? null,
    latestCommitAt: resource.latest_commit_at ? new Date(resource.latest_commit_at) : null,
    readmeSummary: resource.readme_summary ?? resource.description,
    source: resource.source,
    lastUpdated: resource.last_updated,
    metadata: { imported_by: "github_top_ai", imported_at: new Date().toISOString() }
  }).onConflictDoUpdate({
    target: resources.slug,
    set: {
      name: resource.name,
      description: resource.description,
      type: resource.type,
      riskLevel: resource.risk_level,
      trustScore: resource.trust_score,
      fitScore: resource.fit_score,
      githubStars: resource.github_stars ?? 0,
      githubForks: resource.github_forks ?? 0,
      license: resource.license ?? null,
      latestCommitAt: resource.latest_commit_at ? new Date(resource.latest_commit_at) : null,
      source: resource.source,
      lastUpdated: resource.last_updated,
      updatedAt: sql`now()`
    }
  }).returning({ id: resources.id });

    if (!saved) continue;
    for (const tag of resource.tags) {
      const [savedTag] = await db.insert(tags).values({ slug: slugify(tag), name: tag, category: "github_ai" }).onConflictDoUpdate({ target: tags.slug, set: { name: tag, category: "github_ai" } }).returning({ id: tags.id });
      if (!savedTag) continue;
      await db.insert(resourceTags).values({ resourceId: saved.id, tagId: savedTag.id }).onConflictDoNothing();
    }
  }

  await client.end();
  console.log(`Imported ${discovered.length} top AI GitHub resources.`);
}

void main().catch(async (error) => {
  console.error(error);
  await client.end();
  process.exitCode = 1;
});

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-").replace(/^-+|-+$/g, "") || value;
}
