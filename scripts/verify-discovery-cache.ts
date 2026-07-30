import dotenv from "dotenv";

dotenv.config({ path: ".env.sync" });
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { and, asc, eq, lt, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { CapabilityRequirement } from "../lib/capability-engine";
import {
  analysisResultCache,
  discoveryCandidateCache
} from "../lib/db/schema";
import { verifyGitHubRepository } from "../lib/github-discovery-core";
import type { Resource } from "../lib/types";
import * as schema from "../lib/db/schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required.");

const client = postgres(databaseUrl, { max: 4, prepare: false });
const db = drizzle(client, { schema });

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const now = new Date();
  const rows = await db
    .select()
    .from(discoveryCandidateCache)
    .where(and(
      lte(discoveryCandidateCache.nextVerificationAt, now),
      sql`${discoveryCandidateCache.verificationStatus} <> 'rejected'`
    ))
    .orderBy(asc(discoveryCandidateCache.nextVerificationAt))
    .limit(options.limit);

  const counters = {
    processed: 0,
    verified: 0,
    retained: 0,
    stale: 0
  };

  await runWithConcurrency(rows, options.concurrency, async (row) => {
    counters.processed += 1;
    try {
      const resource = await verifyGitHubRepository(
        row.repositoryFullName,
        row.projectTags,
        parseCapabilities(row.capabilityContext)
      );
      if (!resource) {
        await recordFailure(row.repoUrl, row.failureCount, "Repository evidence no longer satisfies cached capabilities.");
        if (row.failureCount + 1 >= 3) counters.stale += 1;
        else counters.retained += 1;
        return;
      }

      await saveVerified(row.repoUrl, resource, row.capabilityIds);
      counters.verified += 1;
    } catch (error) {
      await recordFailure(
        row.repoUrl,
        row.failureCount,
        error instanceof Error ? error.message : String(error)
      );
      if (row.failureCount + 1 >= 3) counters.stale += 1;
      else counters.retained += 1;
    }
  });

  const [expiredAnalyses, expiredCandidates] = await Promise.all([
    db
      .delete(analysisResultCache)
      .where(lt(analysisResultCache.expiresAt, now))
      .returning({ promptHash: analysisResultCache.promptHash }),
    db
      .delete(discoveryCandidateCache)
      .where(and(
        eq(discoveryCandidateCache.verificationStatus, "stale"),
        lt(discoveryCandidateCache.expiresAt, now)
      ))
      .returning({ repoUrl: discoveryCandidateCache.repoUrl })
  ]);

  console.log(JSON.stringify({
    ...counters,
    expiredAnalysisRowsDeleted: expiredAnalyses.length,
    expiredCandidateRowsDeleted: expiredCandidates.length
  }, null, 2));
}

async function saveVerified(
  repoUrl: string,
  resource: Resource,
  existingCapabilityIds: string[]
) {
  const now = new Date();
  await db
    .update(discoveryCandidateCache)
    .set({
      resource,
      capabilityIds: Array.from(new Set([
        ...existingCapabilityIds,
        ...(resource.matched_capabilities ?? [])
      ])),
      verificationStatus: "verified",
      verificationScore: Math.max(
        0,
        Math.min(100, Math.round(resource.trust_score * 0.55 + resource.fit_score * 0.45))
      ),
      failureCount: 0,
      lastError: null,
      lastSeenAt: now,
      lastVerifiedAt: now,
      nextVerificationAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      expiresAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      updatedAt: now
    })
    .where(eq(discoveryCandidateCache.repoUrl, repoUrl));
}

async function recordFailure(repoUrl: string, currentFailureCount: number, error: string) {
  const now = new Date();
  const failureCount = currentFailureCount + 1;
  await db
    .update(discoveryCandidateCache)
    .set({
      verificationStatus: failureCount >= 3 ? "stale" : "verified",
      failureCount,
      lastError: error.slice(0, 1000),
      nextVerificationAt: new Date(now.getTime() + (failureCount >= 3 ? 24 : 6) * 60 * 60 * 1000),
      updatedAt: now
    })
    .where(eq(discoveryCandidateCache.repoUrl, repoUrl));
}

function parseCapabilities(value: unknown): CapabilityRequirement[] {
  return Array.isArray(value)
    ? value.filter((item): item is CapabilityRequirement =>
        Boolean(
          item
          && typeof item === "object"
          && "id" in item
          && typeof item.id === "string"
          && "keywords" in item
          && Array.isArray(item.keywords)
        )
      )
    : [];
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>
) {
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor];
      cursor += 1;
      if (item) await worker(item);
    }
  }));
}

function parseOptions(args: string[]) {
  const values = new Map(args.map((arg) => {
    const [key, value] = arg.replace(/^--/, "").split("=", 2);
    return [key, value];
  }));
  return {
    limit: positiveInteger(values.get("limit"), 100),
    concurrency: Math.min(8, positiveInteger(values.get("concurrency"), 4))
  };
}

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end();
  });
