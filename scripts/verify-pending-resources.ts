import dotenv from "dotenv";

dotenv.config({ path: ".env.sync" });
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { and, asc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  resourceArtifacts,
  resourceEvidence,
  resourceRepositories,
  resourceVerificationRuns
} from "../lib/db/schema";
import {
  replaceArtifactCapabilities,
  syncCapabilityDefinitions
} from "../lib/db/resource-capability-write";
import { parseGitHubRepoUrl, assessRiskLevel } from "../lib/github-import";
import { extractResourceCapabilities } from "../lib/resource-capabilities";
import * as schema from "../lib/db/schema";

type ArtifactKind = typeof resourceArtifacts.$inferSelect.kind;
type VerificationStatus = typeof resourceArtifacts.$inferSelect.verificationStatus;
type EvidenceKind = typeof resourceEvidence.$inferSelect.kind;

type GitHubRepository = {
  full_name: string;
  name: string;
  html_url: string;
  description: string | null;
  homepage: string | null;
  default_branch: string;
  stargazers_count: number;
  forks_count: number;
  subscribers_count?: number;
  open_issues_count: number;
  archived: boolean;
  pushed_at: string | null;
  topics?: string[];
  license: { spdx_id: string | null; name?: string } | null;
};

type GitHubTree = {
  truncated?: boolean;
  tree?: Array<{ path?: string; type?: string }>;
};

type GitHubRelease = {
  tag_name?: string;
  published_at?: string;
};

type RepositorySnapshot = {
  repository: GitHubRepository;
  readme: string;
  paths: string[];
  latestRelease: GitHubRelease | null;
};

type Classification = {
  kind: ArtifactKind;
  confidence: number;
  reason: string;
};

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required.");

const client = postgres(databaseUrl, { max: 4, prepare: false });
const db = drizzle(client, { schema });
const snapshotCache = new Map<string, Promise<RepositorySnapshot>>();

async function main() {
  const options = parseOptions(process.argv.slice(2));
  await syncCapabilityDefinitions(db);

  const filters = [
    eq(resourceArtifacts.verificationStatus, options.status),
    eq(resourceRepositories.provider, "github")
  ];
  if (options.onlyAutomated) {
    filters.push(sql`${resourceArtifacts.metadata}->'validation'->>'classifier_version' = 'resource-verifier-v1'`);
  }

  const rows = await db
    .select({
      artifact: resourceArtifacts,
      repository: resourceRepositories
    })
    .from(resourceArtifacts)
    .innerJoin(resourceRepositories, eq(resourceRepositories.id, resourceArtifacts.repositoryId))
    .where(and(...filters))
    .orderBy(asc(resourceArtifacts.createdAt))
    .limit(options.limit);

  const counters = {
    processed: 0,
    verified: 0,
    rejected: 0,
    stale: 0,
    pending: 0,
    reclassified: 0,
    failed: 0
  };

  await runWithConcurrency(rows, options.concurrency, async (row) => {
    try {
      const parsed = parseGitHubRepoUrl(row.repository.canonicalUrl);
      if (!parsed) throw new Error(`Unsupported GitHub URL: ${row.repository.canonicalUrl}`);
      const repositorySlug = `${parsed.owner}/${parsed.repo}`;
      const snapshot = await getRepositorySnapshot(repositorySlug);
      const result = evaluateArtifact(row.artifact, snapshot);

      if (!options.dryRun) {
        await saveVerification(row.artifact, row.repository.id, snapshot, result);
      }

      counters.processed += 1;
      counters[result.status] += 1;
      if (result.classification.kind !== row.artifact.kind) counters.reclassified += 1;
      console.log(
        `[${counters.processed}/${rows.length}] ${repositorySlug} `
        + `${row.artifact.kind} -> ${result.classification.kind} (${result.status}, ${result.classification.confidence})`
      );
    } catch (error) {
      counters.failed += 1;
      console.warn(`Verification failed for ${row.repository.canonicalUrl}: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  console.log(JSON.stringify({ ...counters, dryRun: options.dryRun }, null, 2));
}

function evaluateArtifact(
  artifact: typeof resourceArtifacts.$inferSelect,
  snapshot: RepositorySnapshot
) {
  const classification = classifyArtifact(artifact, snapshot);
  const hasReadableReadme = snapshot.readme.replace(/\s+/g, " ").trim().length >= 120;
  const hasManifest = snapshot.paths.some(isProjectManifest);
  const hasDirectArtifact = hasDirectArtifactEvidence(classification.kind, artifact.artifactPath, snapshot.paths);
  let status: VerificationStatus;

  if (snapshot.repository.archived) {
    status = "stale";
  } else if (!hasReadableReadme && !hasManifest && !hasDirectArtifact) {
    status = "rejected";
  } else if (classification.confidence >= 70 && (hasReadableReadme || hasDirectArtifact)) {
    status = "verified";
  } else {
    status = "pending";
  }

  const capabilityMatches = extractResourceCapabilities({
    name: artifact.name,
    description: snapshot.repository.description ?? artifact.description,
    tags: [
      ...getStringArray(artifact.metadata, "tags"),
      ...(snapshot.repository.topics ?? [])
    ],
    readme: snapshot.readme,
    paths: snapshot.paths
  });

  return {
    status,
    classification,
    capabilityMatches,
    hasReadableReadme,
    hasManifest,
    hasDirectArtifact
  };
}

function classifyArtifact(
  artifact: typeof resourceArtifacts.$inferSelect,
  snapshot: RepositorySnapshot
): Classification {
  const paths = snapshot.paths.map((path) => path.toLowerCase());
  const repositoryIdentity = normalize([
    snapshot.repository.name,
    snapshot.repository.description ?? "",
    ...(snapshot.repository.topics ?? []),
    snapshot.readme.slice(0, 3000)
  ].join(" "));
  const readmeLead = normalize(snapshot.readme.slice(0, 1200));
  const repositoryName = normalize(snapshot.repository.name);
  const description = normalize(snapshot.repository.description ?? "");
  const topics = new Set((snapshot.repository.topics ?? []).map(normalize));
  const artifactPath = artifact.artifactPath?.toLowerCase() ?? "";
  const skillPaths = paths.filter((path) => path.endsWith("skill.md"));
  const hasRootSkill = skillPaths.includes("skill.md");
  const hasSpecificSkill = artifactPath.endsWith("skill.md") || hasRootSkill;
  const hasRootGitHubAction = paths.some((path) => /^action\.ya?ml$/.test(path));
  const isCollection = repositoryName.startsWith("awesome ")
    || topics.has("awesome")
    || /\bawesome list\b|\bcurated (?:list|collection)\b|\bresource list\b|\bskills collection\b/.test(description)
    || (/^#?\s*awesome\b/.test(readmeLead) && /\b(list|collection|resources)\b/.test(readmeLead));
  const isMcpIdentity = /\bmcp\b/.test(repositoryName)
    || topics.has("mcp")
    || topics.has("mcp-server")
    || topics.has("model-context-protocol")
    || /\bmcp server\b|\bmodel context protocol server\b/.test(description)
    || /^#?\s*.+\bmcp server\b/.test(readmeLead);
  const isGitHubActionIdentity = hasRootGitHubAction
    && (
      /\baction\b|\breviewer\b|\bpull request\b|\bpr\b/.test(repositoryName)
      || topics.has("github-actions")
      || /\bgithub action\b|\bactions marketplace\b/.test(description)
      || /\bgithub action\b|\bactions marketplace\b/.test(readmeLead)
    );
  const isUiIdentity = topics.has("component-library")
    || topics.has("design-system")
    || /\bcomponent library\b|\bui library\b|\bdesign system\b/.test(description)
    || /\bcomponent library\b|\bui library\b|\bdesign system\b/.test(readmeLead);
  const isTemplateIdentity = topics.has("template")
    || topics.has("starter")
    || topics.has("boilerplate")
    || /\bstarter\b|\bboilerplate\b|\btemplate\b|reference implementation/.test(repositoryName)
    || /\bstarter\b|\bboilerplate\b|\btemplate\b|reference implementation/.test(description);
  const isApplicationIdentity = topics.has("self-hosted")
    || /\bself-hosted\b|\bmanagement system\b|\bplatform\b|\bweb application\b|\btracker\b|\berp\b/.test(description)
    || /\bself-hosted\b|\bmanagement system\b|\bweb application\b/.test(readmeLead);
  const isLibraryIdentity = topics.has("library")
    || topics.has("sdk")
    || /\blibrary\b|\bsdk\b|\bframework\b|\bapi client\b|\bpython package\b|\bjavascript package\b/.test(description)
    || /^#?\s*.+\b(library|sdk|framework|api client)\b/.test(readmeLead);

  if (hasSpecificSkill) {
    return classified("agent_skill", 96, "检测到当前资源对应的 SKILL.md。");
  }
  if (isGitHubActionIdentity) {
    return classified("github_action", 95, "检测到 GitHub Action 清单与用途声明。");
  }
  if (isCollection) {
    return classified("awesome_list", 92, "README 表明这是资源集合，不是可直接安装的单一插件。");
  }
  if (
    isMcpIdentity
    && paths.some((path) => isProjectManifest(path) || /(^|\/)(mcp|server)\.json$/.test(path))
  ) {
    return classified("mcp_server", 92, "README 和项目清单共同声明 MCP Server。");
  }
  if (
    isUiIdentity
    && paths.some(isProjectManifest)
  ) {
    return classified("ui_library", 90, "README 声明 UI 组件库或设计系统，并存在项目清单。");
  }
  if (
    /\bdataset\b|data set|open data|training data/.test(repositoryIdentity)
    && paths.some((path) => /\.(csv|parquet|jsonl|arrow)$/.test(path))
  ) {
    return classified("dataset", 88, "README 与仓库文件共同表明这是数据集。");
  }
  if (isTemplateIdentity && paths.some(isProjectManifest)) {
    return classified("project_template", 86, "README 声明模板、脚手架或参考实现。");
  }
  if (
    isApplicationIdentity
    && paths.some(isProjectManifest)
  ) {
    return classified("application", 84, "README 声明可运行应用或业务系统。");
  }
  if (
    isLibraryIdentity
    && paths.some(isProjectManifest)
  ) {
    return classified("library", 82, "README 声明库、SDK、框架或 API 客户端。");
  }
  if (skillPaths.length > 0) {
    return classified("developer_tool", 76, "仓库包含多个 Skill，但根资源本身不是单一 Skill。");
  }
  if (paths.some(isProjectManifest)) {
    return classified("developer_tool", 74, "存在可验证的项目清单，但没有更具体的资源类型声明。");
  }

  return classified(artifact.kind, 45, "缺少足以确认资源类型的直接证据。");
}

async function saveVerification(
  artifact: typeof resourceArtifacts.$inferSelect,
  repositoryId: string,
  snapshot: RepositorySnapshot,
  result: ReturnType<typeof evaluateArtifact>
) {
  const observedAt = new Date();
  const risk = assessRiskLevel({
    stars: snapshot.repository.stargazers_count,
    license: normalizeLicense(snapshot.repository.license),
    latestCommitTime: snapshot.repository.pushed_at,
    archived: snapshot.repository.archived
  });
  const existingMetadata = asMetadata(artifact.metadata);
  const verificationMetadata = {
    ...existingMetadata,
    validation: {
      classifier_version: "resource-verifier-v1",
      classification_reason: result.classification.reason,
      readme_verified: result.hasReadableReadme,
      manifest_verified: result.hasManifest,
      direct_artifact_verified: result.hasDirectArtifact,
      tree_file_count: snapshot.paths.length,
      latest_release: snapshot.latestRelease?.tag_name ?? null,
      open_issues: snapshot.repository.open_issues_count,
      subscribers: snapshot.repository.subscribers_count ?? 0,
      verified_at: observedAt.toISOString()
    },
    capability_ids: result.capabilityMatches.map((match) => match.capabilityId)
  };

  await db.transaction(async (tx) => {
    await tx
      .update(resourceRepositories)
      .set({
        owner: snapshot.repository.full_name.split("/")[0] ?? null,
        name: snapshot.repository.name,
        description: snapshot.repository.description,
        homepageUrl: snapshot.repository.homepage,
        defaultBranch: snapshot.repository.default_branch,
        license: normalizeLicense(snapshot.repository.license),
        stars: snapshot.repository.stargazers_count,
        forks: snapshot.repository.forks_count,
        archived: snapshot.repository.archived,
        latestCommitAt: snapshot.repository.pushed_at ? new Date(snapshot.repository.pushed_at) : null,
        metadata: {
          topics: snapshot.repository.topics ?? [],
          open_issues: snapshot.repository.open_issues_count,
          subscribers: snapshot.repository.subscribers_count ?? 0,
          latest_release: snapshot.latestRelease ?? null
        },
        lastSyncedAt: observedAt,
        updatedAt: observedAt
      })
      .where(eq(resourceRepositories.id, repositoryId));

    await tx
      .update(resourceArtifacts)
      .set({
        kind: result.classification.kind,
        verificationStatus: result.status,
        typeConfidence: result.classification.confidence,
        trustScore: calculateTrustScore(snapshot, result),
        riskLevel: risk.level,
        metadata: verificationMetadata,
        verifiedAt: result.status === "verified" ? observedAt : null,
        updatedAt: observedAt
      })
      .where(eq(resourceArtifacts.id, artifact.id));

    const evidence = buildEvidence(artifact, snapshot, result, risk.reason, observedAt);
    for (const item of evidence) {
      await tx
        .insert(resourceEvidence)
        .values({ artifactId: artifact.id, ...item })
        .onConflictDoUpdate({
          target: [resourceEvidence.artifactId, resourceEvidence.evidenceKey],
          set: {
            kind: item.kind,
            sourceUrl: item.sourceUrl,
            sourcePath: item.sourcePath,
            summary: item.summary,
            confidence: item.confidence,
            payload: item.payload,
            observedAt,
            updatedAt: observedAt
          }
        });
    }

    await tx
      .insert(resourceVerificationRuns)
      .values({
        artifactId: artifact.id,
        runKey: `pending-verifier:${artifact.id}:${observedAt.toISOString()}`,
        source: "github_api",
        status: result.status === "verified" ? "passed" : result.status === "rejected" ? "failed" : "partial",
        classifierVersion: "resource-verifier-v1",
        score: result.classification.confidence,
        checks: {
          classification: result.classification,
          verification_status: result.status,
          readme: result.hasReadableReadme,
          manifest: result.hasManifest,
          direct_artifact: result.hasDirectArtifact,
          capabilities: result.capabilityMatches.map((match) => match.capabilityId)
        },
        completedAt: observedAt
      });

    await replaceArtifactCapabilities(
      tx,
      artifact.id,
      result.capabilityMatches,
      "github_evidence_verifier",
      observedAt
    );
  });
}

function buildEvidence(
  artifact: typeof resourceArtifacts.$inferSelect,
  snapshot: RepositorySnapshot,
  result: ReturnType<typeof evaluateArtifact>,
  riskReason: string,
  observedAt: Date
) {
  const baseUrl = snapshot.repository.html_url;
  const evidence: Array<{
    evidenceKey: string;
    kind: EvidenceKind;
    sourceUrl: string;
    sourcePath: string | null;
    summary: string;
    confidence: number;
    payload: Record<string, unknown>;
    observedAt: Date;
  }> = [{
    evidenceKey: "verified:type",
    kind: "type_declaration",
    sourceUrl: baseUrl,
    sourcePath: artifact.artifactPath,
    summary: `${result.classification.reason} 归类为 ${result.classification.kind}。`,
    confidence: result.classification.confidence,
    payload: { detected_kind: result.classification.kind },
    observedAt
  }];

  if (result.hasReadableReadme) {
    evidence.push({
      evidenceKey: "verified:readme",
      kind: "readme_claim",
      sourceUrl: `${baseUrl}#readme`,
      sourcePath: "README",
      summary: "已读取 README，并用于核对资源用途与能力边界。",
      confidence: 88,
      payload: { characters_inspected: Math.min(snapshot.readme.length, 24000) },
      observedAt
    });
  }

  const manifestPaths = snapshot.paths.filter(isProjectManifest).slice(0, 20);
  if (manifestPaths.length > 0) {
    evidence.push({
      evidenceKey: "verified:manifests",
      kind: manifestPaths.some((path) => /package\.json$/i.test(path)) ? "package_manifest" : "project_manifest",
      sourceUrl: baseUrl,
      sourcePath: manifestPaths[0] ?? null,
      summary: `检测到 ${manifestPaths.length} 个项目或依赖清单。`,
      confidence: 92,
      payload: { paths: manifestPaths },
      observedAt
    });
  }

  const skillPaths = snapshot.paths.filter((path) => /(^|\/)SKILL\.md$/i.test(path)).slice(0, 30);
  if (skillPaths.length > 0) {
    evidence.push({
      evidenceKey: "verified:skills",
      kind: "skill_manifest",
      sourceUrl: baseUrl,
      sourcePath: artifact.artifactPath ?? skillPaths[0] ?? null,
      summary: `检测到 ${skillPaths.length} 个 SKILL.md；仅具体 Skill 路径可作为 Agent Skill 推荐。`,
      confidence: artifact.artifactPath || skillPaths.includes("SKILL.md") ? 96 : 78,
      payload: { paths: skillPaths },
      observedAt
    });
  }

  if (result.classification.kind === "mcp_server") {
    evidence.push({
      evidenceKey: "verified:mcp",
      kind: "mcp_manifest",
      sourceUrl: baseUrl,
      sourcePath: manifestPaths[0] ?? null,
      summary: "README 与项目清单共同确认该资源提供 MCP Server。",
      confidence: 92,
      payload: {},
      observedAt
    });
  }

  evidence.push(
    {
      evidenceKey: "verified:license",
      kind: "license",
      sourceUrl: baseUrl,
      sourcePath: "LICENSE",
      summary: normalizeLicense(snapshot.repository.license)
        ? `GitHub API 检测到许可证：${normalizeLicense(snapshot.repository.license)}。`
        : "GitHub API 未检测到明确 SPDX 许可证。",
      confidence: normalizeLicense(snapshot.repository.license) ? 95 : 70,
      payload: { license: normalizeLicense(snapshot.repository.license) },
      observedAt
    },
    {
      evidenceKey: "verified:maintenance",
      kind: "maintenance",
      sourceUrl: baseUrl,
      sourcePath: null,
      summary: `最近推送：${snapshot.repository.pushed_at ?? "未知"}；最新发布：${snapshot.latestRelease?.published_at ?? "未检测到"}。`,
      confidence: snapshot.repository.pushed_at ? 90 : 55,
      payload: {
        pushed_at: snapshot.repository.pushed_at,
        latest_release: snapshot.latestRelease,
        archived: snapshot.repository.archived,
        open_issues: snapshot.repository.open_issues_count
      },
      observedAt
    },
    {
      evidenceKey: "verified:community",
      kind: "popularity",
      sourceUrl: baseUrl,
      sourcePath: null,
      summary: `社区信号：${snapshot.repository.stargazers_count} Stars、${snapshot.repository.forks_count} Forks、${snapshot.repository.subscribers_count ?? 0} Watchers。`,
      confidence: snapshot.repository.stargazers_count >= 50 ? 90 : 65,
      payload: {
        stars: snapshot.repository.stargazers_count,
        forks: snapshot.repository.forks_count,
        subscribers: snapshot.repository.subscribers_count ?? 0,
        risk_reason: riskReason
      },
      observedAt
    }
  );

  return evidence;
}

async function getRepositorySnapshot(repositorySlug: string) {
  const key = repositorySlug.toLowerCase();
  const cached = snapshotCache.get(key);
  if (cached) return cached;

  const pending = (async (): Promise<RepositorySnapshot> => {
    const repository = await githubJson<GitHubRepository>(`/repos/${repositorySlug}`);
    const [tree, readme, releases] = await Promise.all([
      githubJson<GitHubTree>(`/repos/${repositorySlug}/git/trees/${encodeURIComponent(repository.default_branch)}?recursive=1`)
        .catch(() => ({ tree: [] })),
      githubText(`/repos/${repositorySlug}/readme`).catch(() => ""),
      githubJson<GitHubRelease[]>(`/repos/${repositorySlug}/releases?per_page=1`).catch(() => [])
    ]);

    return {
      repository,
      readme,
      paths: (tree.tree ?? [])
        .filter((item) => item.type === "blob" && item.path)
        .map((item) => item.path as string),
      latestRelease: releases[0] ?? null
    };
  })();

  snapshotCache.set(key, pending);
  return pending;
}

async function githubJson<T>(path: string): Promise<T> {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: githubHeaders("application/vnd.github+json")
  });
  if (!response.ok) throw new Error(`GitHub API ${response.status} for ${path}`);
  return response.json() as Promise<T>;
}

async function githubText(path: string) {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: githubHeaders("application/vnd.github.raw+json")
  });
  if (!response.ok) throw new Error(`GitHub API ${response.status} for ${path}`);
  return response.text();
}

function githubHeaders(accept: string) {
  const token = process.env.GITHUB_TOKEN;
  return {
    Accept: accept,
    "User-Agent": "agent-skill-hub-resource-verifier",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

function isProjectManifest(path: string) {
  return /(^|\/)(package\.json|pyproject\.toml|requirements[^/]*\.txt|go\.mod|cargo\.toml|composer\.json|pom\.xml|build\.gradle(?:\.kts)?|docker-compose\.ya?ml)$/i.test(path);
}

function hasDirectArtifactEvidence(kind: ArtifactKind, artifactPath: string | null, paths: string[]) {
  const lowerArtifactPath = artifactPath?.toLowerCase() ?? "";
  if (kind === "agent_skill") {
    return lowerArtifactPath.endsWith("skill.md") || paths.some((path) => path.toLowerCase() === "skill.md");
  }
  if (kind === "mcp_server") {
    return paths.some((path) => /(^|\/)(mcp|server)\.json$/i.test(path));
  }
  if (kind === "github_action") {
    return paths.some((path) => /(^|\/)action\.ya?ml$/i.test(path));
  }
  return false;
}

function calculateTrustScore(
  snapshot: RepositorySnapshot,
  result: ReturnType<typeof evaluateArtifact>
) {
  let score = 45;
  if (normalizeLicense(snapshot.repository.license)) score += 15;
  if (snapshot.repository.pushed_at) {
    const ageDays = (Date.now() - new Date(snapshot.repository.pushed_at).getTime()) / 86400000;
    if (ageDays <= 240) score += 15;
    else if (ageDays <= 540) score += 7;
  }
  if (snapshot.repository.stargazers_count >= 1000) score += 15;
  else if (snapshot.repository.stargazers_count >= 50) score += 8;
  if (result.hasDirectArtifact) score += 8;
  if (snapshot.repository.archived) score -= 25;
  return Math.max(0, Math.min(98, score));
}

function normalizeLicense(license: GitHubRepository["license"]) {
  const value = license?.spdx_id;
  return value && value !== "NOASSERTION" ? value : null;
}

function parseOptions(args: string[]) {
  const limit = clamp(Number(readArg(args, "limit") ?? 100), 1, 1000);
  const concurrency = clamp(Number(readArg(args, "concurrency") ?? 3), 1, 8);
  const status = readArg(args, "status") ?? "pending";
  if (!["pending", "verified", "rejected", "stale"].includes(status)) {
    throw new Error("--status must be pending, verified, rejected, or stale.");
  }
  return {
    limit,
    concurrency,
    status: status as VerificationStatus,
    dryRun: args.includes("--dry-run"),
    onlyAutomated: args.includes("--only-automated")
  };
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>
) {
  let nextIndex = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      const item = items[currentIndex];
      if (item) await worker(item);
    }
  });
  await Promise.all(runners);
}

function readArg(args: string[], name: string) {
  return args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
}

function clamp(value: number, min: number, max: number) {
  return Number.isFinite(value) ? Math.min(Math.max(Math.floor(value), min), max) : min;
}

function classified(kind: ArtifactKind, confidence: number, reason: string): Classification {
  return { kind, confidence, reason };
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[-_/.]+/g, " ").replace(/\s+/g, " ").trim();
}

function asMetadata(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function getStringArray(value: unknown, key: string) {
  const metadata = asMetadata(value);
  const candidate = metadata[key];
  return Array.isArray(candidate)
    ? candidate.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

void main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end();
  });
