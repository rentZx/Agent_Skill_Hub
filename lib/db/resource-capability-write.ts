import { eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  artifactCapabilities,
  capabilityDefinitions
} from "@/lib/db/schema";
import type * as schema from "@/lib/db/schema";
import {
  resourceCapabilityDefinitions,
  type ResourceCapabilityMatch
} from "@/lib/resource-capabilities";

type ResourceModelDatabase = PostgresJsDatabase<typeof schema>;

export async function syncCapabilityDefinitions(db: ResourceModelDatabase) {
  for (const definition of resourceCapabilityDefinitions) {
    await db
      .insert(capabilityDefinitions)
      .values({
        id: definition.id,
        labelZh: definition.label,
        descriptionZh: definition.description,
        domain: definition.domain,
        resourceRole: definition.role,
        metadata: {
          patterns: definition.patterns,
          negative_patterns: definition.negativePatterns ?? []
        }
      })
      .onConflictDoUpdate({
        target: capabilityDefinitions.id,
        set: {
          labelZh: definition.label,
          descriptionZh: definition.description,
          domain: definition.domain,
          resourceRole: definition.role,
          metadata: {
            patterns: definition.patterns,
            negative_patterns: definition.negativePatterns ?? []
          },
          updatedAt: sql`now()`
        }
      });
  }
}

export async function replaceArtifactCapabilities(
  db: ResourceModelDatabase,
  artifactId: string,
  matches: ResourceCapabilityMatch[],
  source: string,
  observedAt = new Date()
) {
  await db.delete(artifactCapabilities).where(eq(artifactCapabilities.artifactId, artifactId));

  if (matches.length === 0) return;

  await db.insert(artifactCapabilities).values(matches.map((match) => ({
    artifactId,
    capabilityId: match.capabilityId,
    confidence: match.confidence,
    coverageLevel: match.coverageLevel,
    source,
    summary: match.summary,
    matchedTerms: match.matchedTerms,
    observedAt
  })));
}
