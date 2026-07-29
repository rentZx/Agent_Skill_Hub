import { sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  resourceArtifacts,
  resourceEvidence,
  resourceRepositories,
  resourceVerificationRuns
} from "@/lib/db/schema";
import type * as schema from "@/lib/db/schema";
import type { ResourceModelV2 } from "@/lib/resource-model-v2";

type ResourceModelDatabase = PostgresJsDatabase<typeof schema>;

export async function upsertResourceModelV2(
  db: ResourceModelDatabase,
  model: ResourceModelV2
) {
  const [repository] = await db
    .insert(resourceRepositories)
    .values(model.repository)
    .onConflictDoUpdate({
      target: resourceRepositories.canonicalUrl,
      set: {
        provider: model.repository.provider,
        owner: model.repository.owner,
        name: model.repository.name,
        description: model.repository.description,
        homepageUrl: model.repository.homepageUrl,
        defaultBranch: model.repository.defaultBranch,
        license: model.repository.license,
        stars: model.repository.stars,
        forks: model.repository.forks,
        archived: model.repository.archived,
        latestCommitAt: model.repository.latestCommitAt,
        metadata: model.repository.metadata,
        lastSyncedAt: model.repository.lastSyncedAt,
        updatedAt: sql`now()`
      }
    })
    .returning({ id: resourceRepositories.id });

  if (!repository) {
    throw new Error(`Failed to save V2 repository: ${model.repository.canonicalUrl}`);
  }

  const [artifact] = await db
    .insert(resourceArtifacts)
    .values({
      ...model.artifact,
      repositoryId: repository.id
    })
    .onConflictDoUpdate({
      target: [resourceArtifacts.repositoryId, resourceArtifacts.artifactKey],
      set: {
        legacyResourceId: model.artifact.legacyResourceId,
        legacyResourceIds: sql`(
          select array_agg(distinct legacy_id)
          from unnest(
            coalesce(${resourceArtifacts.legacyResourceIds}, '{}'::uuid[])
            || excluded.legacy_resource_ids
          ) as legacy_id
        )`,
        kind: model.artifact.kind,
        name: model.artifact.name,
        description: model.artifact.description,
        artifactPath: model.artifact.artifactPath,
        packageName: model.artifact.packageName,
        installCommand: model.artifact.installCommand,
        verificationStatus: model.artifact.verificationStatus,
        typeConfidence: model.artifact.typeConfidence,
        trustScore: model.artifact.trustScore,
        qualityScore: model.artifact.qualityScore,
        riskLevel: model.artifact.riskLevel,
        metadata: model.artifact.metadata,
        publishedAt: model.artifact.publishedAt,
        verifiedAt: model.artifact.verifiedAt,
        updatedAt: sql`now()`
      }
    })
    .returning({ id: resourceArtifacts.id });

  if (!artifact) {
    throw new Error(`Failed to save V2 artifact: ${model.artifact.artifactKey}`);
  }

  for (const item of model.evidence) {
    await db
      .insert(resourceEvidence)
      .values({
        ...item,
        artifactId: artifact.id
      })
      .onConflictDoUpdate({
        target: [resourceEvidence.artifactId, resourceEvidence.evidenceKey],
        set: {
          kind: item.kind,
          sourceUrl: item.sourceUrl,
          sourcePath: item.sourcePath,
          summary: item.summary,
          confidence: item.confidence,
          payload: item.payload,
          observedAt: item.observedAt,
          updatedAt: sql`now()`
        }
      });
  }

  await db
    .insert(resourceVerificationRuns)
    .values({
      ...model.verificationRun,
      artifactId: artifact.id
    })
    .onConflictDoUpdate({
      target: resourceVerificationRuns.runKey,
      set: {
        artifactId: artifact.id,
        source: model.verificationRun.source,
        status: model.verificationRun.status,
        classifierVersion: model.verificationRun.classifierVersion,
        score: model.verificationRun.score,
        checks: model.verificationRun.checks,
        startedAt: model.verificationRun.startedAt,
        completedAt: model.verificationRun.completedAt
      }
    });

  return { repositoryId: repository.id, artifactId: artifact.id };
}
