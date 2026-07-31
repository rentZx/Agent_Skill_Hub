import type { ResourceType, RiskLevel } from "@/lib/types";

export const RESOURCE_MODEL_CLASSIFIER_VERSION = "resource-model-v2.0.0";

export type RepositoryProvider = "github" | "npm" | "mcp_registry" | "manual";
export type ResourceArtifactKind =
  | "agent_skill"
  | "mcp_server"
  | "github_action"
  | "github_app"
  | "ui_library"
  | "project_template"
  | "library"
  | "application"
  | "dataset"
  | "awesome_list"
  | "developer_tool";
export type ArtifactVerificationStatus = "pending" | "verified" | "rejected" | "stale";
export type ResourceEvidenceKind =
  | "type_declaration"
  | "skill_manifest"
  | "mcp_manifest"
  | "package_manifest"
  | "project_manifest"
  | "github_action"
  | "github_app"
  | "readme_claim"
  | "license"
  | "maintenance"
  | "popularity"
  | "manual_review";

export type LegacyResourceModelInput = {
  legacyResourceId: string;
  slug: string;
  name: string;
  type: ResourceType;
  description: string;
  repoUrl: string;
  installCommand: string;
  source: string;
  riskLevel: RiskLevel;
  trustScore: number;
  fitScore: number;
  githubStars: number;
  githubForks: number;
  license?: string | null;
  latestCommitAt?: Date | string | null;
  artifactPath?: string | null;
  packageName?: string | null;
  hasSkillMd?: boolean;
  hasMcpManifest?: boolean;
  hasPackageJson?: boolean;
  hasProjectManifest?: boolean;
  hasGithubAction?: boolean;
  hasGithubApp?: boolean;
  hasDatasetManifest?: boolean;
  isCurated?: boolean;
  tags: string[];
  supportedAgents?: string[];
  useCases?: string[];
  metadata?: Record<string, unknown>;
  observedAt?: Date | string;
  runKey: string;
  runSource: string;
};

export type ResourceModelV2 = {
  repository: {
    canonicalUrl: string;
    provider: RepositoryProvider;
    owner: string | null;
    name: string;
    description: string;
    homepageUrl: string | null;
    defaultBranch: string | null;
    license: string | null;
    stars: number;
    forks: number;
    archived: boolean;
    latestCommitAt: Date | null;
    metadata: Record<string, unknown>;
    lastSyncedAt: Date;
  };
  artifact: {
    legacyResourceId: string;
    legacyResourceIds: string[];
    artifactKey: string;
    kind: ResourceArtifactKind;
    name: string;
    description: string;
    artifactPath: string | null;
    packageName: string | null;
    installCommand: string;
    verificationStatus: ArtifactVerificationStatus;
    typeConfidence: number;
    trustScore: number;
    qualityScore: number;
    riskLevel: RiskLevel;
    metadata: Record<string, unknown>;
    publishedAt: Date | null;
    verifiedAt: Date | null;
  };
  evidence: Array<{
    evidenceKey: string;
    kind: ResourceEvidenceKind;
    sourceUrl: string | null;
    sourcePath: string | null;
    summary: string;
    confidence: number;
    payload: Record<string, unknown>;
    observedAt: Date;
  }>;
  verificationRun: {
    runKey: string;
    source: string;
    status: "passed" | "partial";
    classifierVersion: string;
    score: number;
    checks: Record<string, unknown>;
    startedAt: Date;
    completedAt: Date;
  };
};

export function buildResourceModelV2(input: LegacyResourceModelInput): ResourceModelV2 {
  const metadata = input.metadata ?? {};
  const observedAt = toDate(input.observedAt) ?? new Date();
  const repository = parseRepository(input, metadata, observedAt);
  const signals = collectSignals(input, metadata);
  const kind = classifyArtifactKind(input, signals);
  const verification = classifyVerification(input, signals, kind);
  const evidence = buildEvidence(input, signals, repository.canonicalUrl, observedAt);

  return {
    repository,
    artifact: {
      legacyResourceId: input.legacyResourceId,
      legacyResourceIds: [input.legacyResourceId],
      artifactKey: buildArtifactKey(input, kind, metadata),
      kind,
      name: input.name,
      description: input.description,
      artifactPath: normalizePath(input.artifactPath),
      packageName: input.packageName ?? getString(metadata, "package_name"),
      installCommand: input.installCommand,
      verificationStatus: verification.status,
      typeConfidence: verification.confidence,
      trustScore: clampScore(input.trustScore),
      qualityScore: clampScore(Math.round(input.trustScore * 0.55 + input.fitScore * 0.45)),
      riskLevel: input.riskLevel,
      metadata: {
        ...metadata,
        legacy_slug: input.slug,
        legacy_type: input.type,
        tags: input.tags,
        supported_agents: input.supportedAgents ?? ["Codex"],
        use_cases: input.useCases ?? [],
        legacy_fit_score: clampScore(input.fitScore),
        classifier_version: RESOURCE_MODEL_CLASSIFIER_VERSION
      },
      publishedAt: verification.status === "verified" ? observedAt : null,
      verifiedAt: verification.status === "verified" ? observedAt : null
    },
    evidence,
    verificationRun: {
      runKey: input.runKey,
      source: input.runSource,
      status: verification.status === "verified" ? "passed" : "partial",
      classifierVersion: RESOURCE_MODEL_CLASSIFIER_VERSION,
      score: verification.confidence,
      checks: {
        legacy_type: input.type,
        classified_kind: kind,
        verification_status: verification.status,
        evidence_keys: evidence.map((item) => item.evidenceKey),
        direct_type_evidence: verification.directEvidence
      },
      startedAt: observedAt,
      completedAt: observedAt
    }
  };
}

function parseRepository(
  input: LegacyResourceModelInput,
  metadata: Record<string, unknown>,
  observedAt: Date
): ResourceModelV2["repository"] {
  const github = parseGitHubUrl(input.repoUrl);
  const provider: RepositoryProvider = github
    ? "github"
    : input.source === "mcp_registry"
      ? "mcp_registry"
      : input.source === "npm_catalog" || /npmjs\.com/i.test(input.repoUrl)
        ? "npm"
        : "manual";
  const canonicalUrl = github?.url
    ?? normalizeUrl(input.repoUrl)
    ?? `urn:agent-skill-hub:${input.source}:${input.slug}`;

  return {
    canonicalUrl,
    provider,
    owner: github?.owner ?? null,
    name: github?.name ?? input.packageName ?? getString(metadata, "package_name") ?? input.name,
    description: input.description,
    homepageUrl: normalizeUrl(getString(metadata, "homepage_url")),
    defaultBranch: getString(metadata, "default_branch"),
    license: normalizeLicense(input.license),
    stars: Math.max(0, input.githubStars),
    forks: Math.max(0, input.githubForks),
    archived: getBoolean(metadata, "archived") ?? false,
    latestCommitAt: toDate(input.latestCommitAt),
    metadata: {
      source: input.source,
      source_url: getString(metadata, "source_url") ?? input.repoUrl
    },
    lastSyncedAt: observedAt
  };
}

function collectSignals(input: LegacyResourceModelInput, metadata: Record<string, unknown>) {
  return {
    hasSkillMd: input.hasSkillMd ?? getBoolean(metadata, "has_skill_md") ?? false,
    hasMcpManifest: input.hasMcpManifest ?? getBoolean(metadata, "has_mcp_manifest") ?? false,
    hasPackageJson: input.hasPackageJson ?? getBoolean(metadata, "has_package_json") ?? false,
    hasProjectManifest: input.hasProjectManifest ?? getBoolean(metadata, "has_project_manifest") ?? false,
    hasGithubAction: input.hasGithubAction ?? getBoolean(metadata, "has_github_action") ?? false,
    hasGithubApp: input.hasGithubApp ?? getBoolean(metadata, "has_github_app") ?? false,
    hasDatasetManifest: input.hasDatasetManifest ?? getBoolean(metadata, "has_dataset_manifest") ?? false,
    isCurated: input.isCurated
      ?? getBoolean(metadata, "is_curated_anchor")
      ?? (input.source === "curated_seed"),
    text: [
      input.name,
      input.description,
      input.tags.join(" "),
      input.installCommand,
      getString(metadata, "source_kind") ?? ""
    ].join(" ").toLowerCase()
  };
}

function classifyArtifactKind(
  input: LegacyResourceModelInput,
  signals: ReturnType<typeof collectSignals>
): ResourceArtifactKind {
  if (input.type === "agent_skill") return "agent_skill";
  if (input.type === "mcp_server") return "mcp_server";
  if (input.type === "ui_component") return "ui_library";
  if (input.type === "template_repo") return "project_template";
  if (signals.hasGithubAction) return "github_action";
  if (signals.hasGithubApp) return "github_app";
  if (/\bawesome(?:[- ]list)?\b/.test(signals.text)) return "awesome_list";
  if (signals.hasDatasetManifest) return "dataset";
  if (/\b(application|platform|system|web app|desktop app|应用|平台|系统)\b/.test(signals.text)) {
    return "application";
  }
  if (/\b(library|framework|sdk|client|api|engine|toolkit|model|库|框架|模型)\b/.test(signals.text)) {
    return "library";
  }
  return "developer_tool";
}

function classifyVerification(
  input: LegacyResourceModelInput,
  signals: ReturnType<typeof collectSignals>,
  kind: ResourceArtifactKind
) {
  if (kind === "agent_skill" && signals.hasSkillMd) {
    return { status: "verified" as const, confidence: 98, directEvidence: "skill_manifest" };
  }
  if (kind === "mcp_server" && (signals.hasMcpManifest || input.source === "mcp_registry")) {
    return { status: "verified" as const, confidence: 98, directEvidence: "mcp_manifest" };
  }
  if (kind === "mcp_server" && signals.hasPackageJson && /\bmcp\b|model context protocol/.test(signals.text)) {
    return { status: "verified" as const, confidence: 88, directEvidence: "package_manifest" };
  }
  if (kind === "github_action" && signals.hasGithubAction) {
    return { status: "verified" as const, confidence: 96, directEvidence: "github_action" };
  }
  if (kind === "github_app" && signals.hasGithubApp) {
    return { status: "verified" as const, confidence: 96, directEvidence: "github_app" };
  }
  if (kind === "ui_library" && signals.hasPackageJson && /\b(ui|component|design system|组件)\b/.test(signals.text)) {
    return { status: "verified" as const, confidence: 86, directEvidence: "package_manifest" };
  }
  if (
    (kind === "project_template" || kind === "library" || kind === "application" || kind === "developer_tool")
    && (signals.hasProjectManifest || signals.hasPackageJson)
  ) {
    return { status: "verified" as const, confidence: 78, directEvidence: "project_manifest" };
  }
  return { status: "pending" as const, confidence: 35, directEvidence: null };
}

function buildArtifactKey(
  input: LegacyResourceModelInput,
  kind: ResourceArtifactKind,
  metadata: Record<string, unknown>
) {
  const artifactPath = normalizePath(input.artifactPath ?? getString(metadata, "skill_path"));
  if (kind === "agent_skill" && artifactPath) return `skill:${artifactPath.toLowerCase()}`;

  const packageName = input.packageName
    ?? getString(metadata, "package_name")
    ?? extractPackageName(input.installCommand);
  if (packageName) return `package:${packageName.toLowerCase()}`;

  return "root";
}

function buildEvidence(
  input: LegacyResourceModelInput,
  signals: ReturnType<typeof collectSignals>,
  sourceUrl: string,
  observedAt: Date
): ResourceModelV2["evidence"] {
  const evidence: ResourceModelV2["evidence"] = [];
  const add = (
    evidenceKey: string,
    kind: ResourceEvidenceKind,
    summary: string,
    confidence: number,
    sourcePath: string | null = null,
    payload: Record<string, unknown> = {}
  ) => evidence.push({
    evidenceKey,
    kind,
    sourceUrl,
    sourcePath,
    summary,
    confidence,
    payload,
    observedAt
  });

  add("legacy-type", "type_declaration", `旧模型声明类型：${input.type}`, 45, null, {
    source: input.source,
    legacy_type: input.type
  });
  if (signals.hasSkillMd) {
    add("skill-manifest", "skill_manifest", "已检测到 SKILL.md 技能清单。", 98, normalizePath(input.artifactPath));
  }
  if (signals.hasMcpManifest || input.source === "mcp_registry") {
    add("mcp-manifest", "mcp_manifest", "已检测到 MCP 注册表或服务清单。", 98);
  }
  if (signals.hasPackageJson) {
    add("package-manifest", "package_manifest", "已检测到 package.json 或包注册表信息。", 85);
  }
  if (signals.hasProjectManifest) {
    add("project-manifest", "project_manifest", "已检测到可运行项目清单。", 82);
  }
  if (signals.hasGithubAction) {
    add("github-action", "github_action", "已检测到 GitHub Action 配置。", 96);
  }
  if (signals.hasGithubApp) {
    add("github-app", "github_app", "已检测到 GitHub App 配置。", 96);
  }
  if (signals.isCurated) {
    add("manual-review", "manual_review", "该资源属于人工精选或领域锚点。", 95);
  }
  const license = normalizeLicense(input.license);
  if (license) {
    add("license", "license", `许可证：${license}`, 90, null, { license });
  }
  if (input.latestCommitAt) {
    add("maintenance", "maintenance", "已记录最近维护时间。", 80, null, {
      latest_commit_at: toDate(input.latestCommitAt)?.toISOString()
    });
  }
  if (input.githubStars > 0) {
    add("popularity", "popularity", `GitHub Stars：${input.githubStars}`, 70, null, {
      stars: input.githubStars,
      forks: input.githubForks
    });
  }

  return evidence;
}

function parseGitHubUrl(value: string) {
  const match = value.trim().match(/^https?:\/\/(?:www\.)?github\.com\/([^/?#]+)\/([^/?#]+)/i);
  if (!match) return null;
  const owner = match[1];
  const name = match[2].replace(/\.git$/i, "");
  return owner && name
    ? { owner, name, url: `https://github.com/${owner}/${name}` }
    : null;
}

function normalizeUrl(value?: string | null) {
  const normalized = value?.trim().replace(/^git\+/, "").replace(/\.git$/, "").replace(/\/+$/, "");
  return normalized || null;
}

function normalizePath(value?: string | null) {
  const normalized = value?.trim().replace(/\\/g, "/").replace(/^\/+/, "");
  return normalized || null;
}

function normalizeLicense(value?: string | null) {
  const normalized = value?.trim();
  return normalized && !/^(noassertion|other|none|null)$/i.test(normalized) ? normalized : null;
}

function extractPackageName(command: string) {
  const match = command.match(/(?:npx(?:\s+-y)?|npm install)\s+([@a-z0-9._/-]+)/i);
  return match?.[1]?.replace(/[^@a-z0-9._/-]+/gi, "") ?? null;
}

function getString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function getBoolean(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "boolean" ? value : null;
}

function toDate(value?: Date | string | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? Math.round(value) : 0));
}
