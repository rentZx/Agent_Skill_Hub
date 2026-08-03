import "server-only";

import { createHash } from "node:crypto";
import {
  and,
  arrayOverlaps,
  desc,
  eq,
  gt,
  or,
  sql
} from "drizzle-orm";
import {
  isGenericCapabilityId,
  type CapabilityRequirement
} from "@/lib/capability-engine";
import { getDb } from "@/lib/db/client";
import {
  analysisResultCache,
  discoveryCandidateCache
} from "@/lib/db/schema";
import { DISCOVERY_CLASSIFIER_VERSION } from "@/lib/github-discovery-core";
import { isResourceRecommendationEligible } from "@/lib/resource-verification";
import type { Resource } from "@/lib/types";

export const ANALYSIS_CACHE_VERSION = "analyzer-cache-v22";

const analysisTtlMs = positiveInteger(
  process.env.ANALYSIS_CACHE_TTL_MS,
  12 * 60 * 60 * 1000
);
const candidateTtlMs = positiveInteger(
  process.env.DISCOVERY_CACHE_TTL_MS,
  14 * 24 * 60 * 60 * 1000
);
const candidateVerificationMs = positiveInteger(
  process.env.DISCOVERY_VERIFICATION_INTERVAL_MS,
  24 * 60 * 60 * 1000
);

export type DiscoveryCacheContext = {
  tags: string[];
  capabilities: CapabilityRequirement[];
  searchQueries: string[];
};

export async function readAnalysisResultCache<T>(
  input: string,
  scope = "default"
): Promise<T | null> {
  const db = getDb();
  if (!db) return null;

  const promptHash = hashPrompt(input, scope);
  const [row] = await db
    .update(analysisResultCache)
    .set({
      hitCount: sql`${analysisResultCache.hitCount} + 1`,
      lastAccessedAt: new Date()
    })
    .where(and(
      eq(analysisResultCache.promptHash, promptHash),
      eq(analysisResultCache.cacheVersion, ANALYSIS_CACHE_VERSION),
      gt(analysisResultCache.expiresAt, new Date())
    ))
    .returning({ result: analysisResultCache.result });

  return row ? row.result as T : null;
}

export async function writeAnalysisResultCache(
  input: string,
  result: unknown,
  scope = "default"
) {
  const db = getDb();
  if (!db) return;

  const now = new Date();
  const promptHash = hashPrompt(input, scope);
  await db
    .insert(analysisResultCache)
    .values({
      promptHash,
      normalizedPrompt: normalizePrompt(input),
      result,
      cacheVersion: ANALYSIS_CACHE_VERSION,
      expiresAt: new Date(now.getTime() + analysisTtlMs),
      createdAt: now,
      lastAccessedAt: now,
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: analysisResultCache.promptHash,
      set: {
        normalizedPrompt: normalizePrompt(input),
        result,
        cacheVersion: ANALYSIS_CACHE_VERSION,
        hitCount: 0,
        expiresAt: new Date(now.getTime() + analysisTtlMs),
        lastAccessedAt: now,
        updatedAt: now
      }
    });
}

export async function readDiscoveryCandidateCache(
  context: Pick<DiscoveryCacheContext, "tags" | "capabilities">,
  limit = 32
): Promise<Resource[]> {
  const db = getDb();
  if (!db) return [];

  const tags = normalizeTerms(context.tags);
  const capabilityIds = normalizeTerms(context.capabilities.map((capability) => capability.id));
  const matches = [
    ...(tags.length > 0 ? [arrayOverlaps(discoveryCandidateCache.projectTags, tags)] : []),
    ...(capabilityIds.length > 0
      ? [arrayOverlaps(discoveryCandidateCache.capabilityIds, capabilityIds)]
      : [])
  ];
  if (matches.length === 0) return [];

  const rows = await db
    .select({ resource: discoveryCandidateCache.resource })
    .from(discoveryCandidateCache)
    .where(and(
      eq(discoveryCandidateCache.verificationStatus, "verified"),
      gt(discoveryCandidateCache.expiresAt, new Date()),
      or(...matches)
    ))
    .orderBy(
      desc(discoveryCandidateCache.verificationScore),
      desc(discoveryCandidateCache.lastVerifiedAt)
    )
    .limit(Math.max(1, Math.min(limit, 64)));

  const specificCapabilityIds = new Set(
    capabilityIds.filter((id) => !isGenericCapabilityId(id))
  );
  const specificTags = new Set(tags.filter(isSpecificCacheTag));

  return rows
    .map((row) => row.resource as Resource)
    .filter((resource) =>
      resource.discovery_classifier_version === DISCOVERY_CLASSIFIER_VERSION
    )
    .filter((resource) => {
      const capabilityHits = (resource.matched_capabilities ?? [])
        .filter((id) => specificCapabilityIds.has(id)).length;
      if (capabilityHits > 0) return true;
      const tagHits = resource.tags
        .map((tag) => tag.toLowerCase())
        .filter((tag) => specificTags.has(tag)).length;
      return tagHits >= 2;
    })
    .filter(isCachedResource)
    .filter(isResourceRecommendationEligible);
}

export async function writeDiscoveryCandidateCache(
  resources: Resource[],
  context: DiscoveryCacheContext
) {
  const db = getDb();
  const verifiedResources = resources.filter(isResourceRecommendationEligible);
  if (!db || verifiedResources.length === 0) return;

  const now = new Date();
  const rows = verifiedResources.flatMap((resource) => {
    const repositoryFullName = parseGitHubFullName(resource.repo_url);
    if (!repositoryFullName) return [];
    return [{
      repoUrl: resource.repo_url,
      repositoryFullName,
      resource,
      projectTags: normalizeTerms(resource.tags),
      capabilityIds: normalizeTerms(resource.matched_capabilities ?? []),
      capabilityContext: context.capabilities,
      searchQueries: normalizeTerms(context.searchQueries),
      verificationStatus: "verified",
      verificationScore: Math.max(
        0,
        Math.min(100, Math.round(resource.trust_score * 0.55 + resource.fit_score * 0.45))
      ),
      failureCount: 0,
      lastError: null,
      firstSeenAt: now,
      lastSeenAt: now,
      lastVerifiedAt: now,
      nextVerificationAt: new Date(now.getTime() + candidateVerificationMs),
      expiresAt: new Date(now.getTime() + candidateTtlMs),
      updatedAt: now
    }];
  });
  if (rows.length === 0) return;

  await db
    .insert(discoveryCandidateCache)
    .values(rows)
    .onConflictDoUpdate({
      target: discoveryCandidateCache.repoUrl,
      set: {
        repositoryFullName: sql`excluded.repository_full_name`,
        resource: sql`excluded.resource`,
        projectTags: sql`excluded.project_tags`,
        capabilityIds: sql`excluded.capability_ids`,
        capabilityContext: sql`excluded.capability_context`,
        searchQueries: sql`(
          select array_agg(distinct value)
          from unnest(
            ${discoveryCandidateCache.searchQueries} || excluded.search_queries
          ) as value
        )`,
        verificationStatus: "verified",
        verificationScore: sql`excluded.verification_score`,
        failureCount: 0,
        lastError: null,
        lastSeenAt: now,
        lastVerifiedAt: now,
        nextVerificationAt: new Date(now.getTime() + candidateVerificationMs),
        expiresAt: new Date(now.getTime() + candidateTtlMs),
        updatedAt: now
      }
    });
}

function hashPrompt(input: string, scope: string) {
  return createHash("sha256")
    .update(`${ANALYSIS_CACHE_VERSION}\n${scope}\n${normalizePrompt(input)}`)
    .digest("hex");
}

function normalizePrompt(input: string) {
  return input.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeTerms(values: string[]) {
  return Array.from(new Set(
    values
      .map((value) => value.normalize("NFKC").trim().toLowerCase())
      .filter((value) => value.length >= 2 && value.length <= 120)
  )).slice(0, 80);
}

function isSpecificCacheTag(value: string) {
  return value.length >= 4
    && ![
      "ai", "agent", "api", "app", "application", "backend", "database",
      "frontend", "github", "management", "platform", "react", "saas",
      "system", "tool", "tools", "web", "web-app"
    ].includes(value);
}

function parseGitHubFullName(repoUrl: string) {
  try {
    const url = new URL(repoUrl);
    if (url.hostname.toLowerCase() !== "github.com") return null;
    const [owner, repository] = url.pathname.split("/").filter(Boolean);
    if (!owner || !repository) return null;
    return `${owner}/${repository.replace(/\.git$/i, "")}`;
  } catch {
    return null;
  }
}

function isCachedResource(value: Resource) {
  return Boolean(
    value
    && typeof value.id === "string"
    && typeof value.name === "string"
    && typeof value.repo_url === "string"
    && Array.isArray(value.tags)
  );
}

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
