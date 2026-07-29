import { desc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  artifactCapabilities,
  resourceArtifacts,
  resourceEvidence,
  resourceRepositories
} from "@/lib/db/schema";
import type * as schema from "@/lib/db/schema";
import type { Resource, ResourceType } from "@/lib/types";

type ResourceModelDatabase = PostgresJsDatabase<typeof schema>;
type ArtifactKind = typeof resourceArtifacts.$inferSelect.kind;
type EvidenceKind = typeof resourceEvidence.$inferSelect.kind;

export async function listVerifiedResourceArtifacts(db: ResourceModelDatabase): Promise<Resource[]> {
  const [rows, capabilityRows] = await Promise.all([
    db
      .select({
        artifact: resourceArtifacts,
        repository: resourceRepositories,
        evidenceKind: resourceEvidence.kind,
        evidenceSummary: resourceEvidence.summary
      })
      .from(resourceArtifacts)
      .innerJoin(resourceRepositories, eq(resourceRepositories.id, resourceArtifacts.repositoryId))
      .leftJoin(resourceEvidence, eq(resourceEvidence.artifactId, resourceArtifacts.id))
      .where(eq(resourceArtifacts.verificationStatus, "verified"))
      .orderBy(desc(resourceArtifacts.qualityScore), desc(resourceArtifacts.trustScore)),
    db
      .select({
        artifactId: artifactCapabilities.artifactId,
        capabilityId: artifactCapabilities.capabilityId,
        summary: artifactCapabilities.summary
      })
      .from(artifactCapabilities)
  ]);

  const capabilityMap = new Map<string, { ids: string[]; summaries: string[] }>();
  for (const row of capabilityRows) {
    const entry = capabilityMap.get(row.artifactId) ?? { ids: [], summaries: [] };
    if (!entry.ids.includes(row.capabilityId)) entry.ids.push(row.capabilityId);
    if (row.summary && !entry.summaries.includes(row.summary)) entry.summaries.push(row.summary);
    capabilityMap.set(row.artifactId, entry);
  }

  const mapped = new Map<string, Resource & { evidenceKinds: Set<EvidenceKind>; evidence: string[] }>();

  for (const row of rows) {
    // Collections are useful discovery sources, but they are not installable recommendations.
    if (row.artifact.kind === "awesome_list") continue;

    const existing = mapped.get(row.artifact.id);
    if (existing) {
      if (row.evidenceKind) existing.evidenceKinds.add(row.evidenceKind);
      if (row.evidenceSummary && !existing.evidence.includes(row.evidenceSummary)) {
        existing.evidence.push(row.evidenceSummary);
      }
      continue;
    }

    const metadata = asMetadata(row.artifact.metadata);
    const evidenceKinds = new Set<EvidenceKind>();
    const capabilityEvidence = capabilityMap.get(row.artifact.id);
    const evidence = [
      ...(row.evidenceSummary ? [row.evidenceSummary] : []),
      ...(capabilityEvidence?.summaries ?? [])
    ];
    if (row.evidenceKind) evidenceKinds.add(row.evidenceKind);

    mapped.set(row.artifact.id, {
      id: row.artifact.id,
      slug: getString(metadata, "legacy_slug") ?? slugify(`${row.artifact.name}-${row.artifact.id.slice(0, 8)}`),
      name: row.artifact.name,
      type: mapArtifactKind(row.artifact.kind),
      description: row.artifact.description,
      tags: getStringArray(metadata, "tags"),
      supported_agents: getStringArray(metadata, "supported_agents", ["Codex"]),
      install_command: row.artifact.installCommand,
      use_cases: getStringArray(metadata, "use_cases", [row.artifact.description]),
      risk_level: row.artifact.riskLevel,
      trust_score: row.artifact.trustScore,
      fit_score: getNumber(metadata, "legacy_fit_score") ?? row.artifact.qualityScore,
      repo_url: row.repository.canonicalUrl,
      github_stars: row.repository.stars,
      github_forks: row.repository.forks,
      license: row.repository.license,
      latest_commit_at: row.repository.latestCommitAt?.toISOString() ?? null,
      readme_summary: row.repository.description ?? row.artifact.description,
      artifact_path: row.artifact.artifactPath ?? undefined,
      source: "resource_model_v2",
      last_updated: row.repository.lastSyncedAt.toISOString().slice(0, 10),
      last_synced_at: row.repository.lastSyncedAt.toISOString(),
      verification_status: row.artifact.verificationStatus,
      artifact_kind: row.artifact.kind,
      type_confidence: row.artifact.typeConfidence,
      matched_capabilities: capabilityEvidence?.ids ?? [],
      evidenceKinds,
      evidence
    });
  }

  return Array.from(mapped.values()).map(({ evidenceKinds, evidence, ...resource }) => ({
    ...resource,
    has_skill_md: evidenceKinds.has("skill_manifest"),
    has_mcp_manifest: evidenceKinds.has("mcp_manifest"),
    has_package_json: evidenceKinds.has("package_manifest"),
    has_project_manifest: evidenceKinds.has("project_manifest"),
    has_github_action: evidenceKinds.has("github_action"),
    is_curated: evidenceKinds.has("manual_review"),
    evidence_summary: evidence.join("；")
  }));
}

function mapArtifactKind(kind: ArtifactKind): ResourceType {
  if (kind === "agent_skill") return "agent_skill";
  if (kind === "mcp_server") return "mcp_server";
  if (kind === "ui_library") return "ui_component";
  if (kind === "project_template") return "template_repo";
  return "github_plugin";
}

function asMetadata(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function getString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function getStringArray(metadata: Record<string, unknown>, key: string, fallback: string[] = []) {
  const value = metadata[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.length > 0)
    : fallback;
}

function getNumber(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
