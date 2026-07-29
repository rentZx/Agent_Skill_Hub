import type { Resource } from "@/lib/types";

export type ResourceVerificationStatus =
  | "verified"
  | "curated"
  | "package_verified"
  | "unverified";

export type ResourceVerification = {
  status: ResourceVerificationStatus;
  label: string;
  reason: string;
  recommendationEligible: boolean;
};

export function getResourceVerification(resource: Resource): ResourceVerification {
  if (resource.source === "curated_seed" || resource.is_curated || resource.source === "benchmark") {
    return verification("curated", "人工精选", "资源类型经过人工精选或领域锚点确认。", true);
  }

  if (resource.type === "agent_skill") {
    return resource.has_skill_md
      ? verification("verified", "Skill 已验证", "已定位具体 SKILL.md 文件。", true)
      : verification("unverified", "Skill 类型待验证", "未定位 SKILL.md，不能作为可安装 Skill 推荐。", false);
  }

  if (resource.type === "mcp_server") {
    if (resource.has_mcp_manifest || resource.source === "mcp_registry") {
      return verification("verified", "MCP 已验证", "已发现 MCP Registry、Manifest 或服务器配置证据。", true);
    }
    if (resource.has_package_json && hasMcpSignal(resource)) {
      return verification("package_verified", "MCP 包已验证", "已发现 npm 包信息和明确的 MCP Server 标识。", true);
    }
    return verification("unverified", "MCP 类型待验证", "未发现 MCP Server 清单、注册表或可执行包证据。", false);
  }

  if (resource.type === "github_plugin") {
    if (resource.has_github_action) {
      return verification("verified", "GitHub 插件已验证", "已发现 action.yml、action.yaml 或 GitHub App 证据。", true);
    }
    if (
      (resource.has_project_manifest || resource.has_package_json)
      && (resource.matched_capabilities?.length ?? 0) > 0
    ) {
      return verification("package_verified", "开发工具已验证", "已发现项目清单和能力证据。", true);
    }
    return verification("unverified", "插件类型待验证", "未发现 GitHub Action、GitHub App 或项目能力证据。", false);
  }

  if (resource.type === "ui_component") {
    if ((resource.has_package_json || resource.has_project_manifest) && hasUiLibrarySignal(resource)) {
      return verification("package_verified", "UI 包已验证", "已发现组件库相关标识和项目包清单。", true);
    }
    return verification("unverified", "UI 类型待验证", "未发现可复用组件库和项目包证据。", false);
  }

  if (resource.has_project_manifest || resource.has_package_json) {
    return verification("package_verified", "项目结构已验证", "已发现可运行项目或包清单。", true);
  }

  return verification("unverified", "模板类型待验证", "未发现项目清单或人工确认信息。", false);
}

export function isResourceRecommendationEligible(resource: Resource) {
  return getResourceVerification(resource).recommendationEligible;
}

export function mergeCanonicalResources(resources: Resource[]) {
  const merged = new Map<string, Resource>();

  resources.forEach((resource) => {
    const key = getCanonicalResourceKey(resource);
    const existing = merged.get(key);
    merged.set(key, existing ? selectPreferredResource(existing, resource) : resource);
  });

  return Array.from(merged.values());
}

export function getCanonicalResourceKey(resource: Resource) {
  const repository = normalizeRepositoryUrl(resource.repo_url);
  if (!repository || isGenericRepositoryUrl(repository)) return `resource:${resource.id}`;

  if (resource.type === "agent_skill" && resource.artifact_path) {
    return `${repository}#skill:${normalizeArtifact(resource.artifact_path)}`;
  }

  const verification = getResourceVerification(resource);
  if (resource.type === "mcp_server" && verification.recommendationEligible) {
    const packageIdentity = getPackageIdentity(resource.install_command);
    if (packageIdentity) return `${repository}#mcp:${packageIdentity}`;
  }

  return repository;
}

function selectPreferredResource(left: Resource, right: Resource) {
  const comparison = compareResourceEvidence(right, left);
  if (comparison !== 0) return comparison > 0 ? right : left;
  return right.id.localeCompare(left.id) < 0 ? right : left;
}

function compareResourceEvidence(left: Resource, right: Resource) {
  const leftVerification = verificationWeight(getResourceVerification(left).status);
  const rightVerification = verificationWeight(getResourceVerification(right).status);
  if (leftVerification !== rightVerification) return leftVerification - rightVerification;

  const leftTypeEvidence = typeEvidenceWeight(left);
  const rightTypeEvidence = typeEvidenceWeight(right);
  if (leftTypeEvidence !== rightTypeEvidence) return leftTypeEvidence - rightTypeEvidence;

  const leftSource = sourceWeight(left);
  const rightSource = sourceWeight(right);
  if (leftSource !== rightSource) return leftSource - rightSource;

  const leftRecommendation = left.ai_recommendation_weight ?? 0;
  const rightRecommendation = right.ai_recommendation_weight ?? 0;
  if (leftRecommendation !== rightRecommendation) return leftRecommendation - rightRecommendation;

  return left.fit_score + left.trust_score - (right.fit_score + right.trust_score);
}

function verification(
  status: ResourceVerificationStatus,
  label: string,
  reason: string,
  recommendationEligible: boolean
): ResourceVerification {
  return { status, label, reason, recommendationEligible };
}

function verificationWeight(status: ResourceVerificationStatus) {
  if (status === "verified") return 4;
  if (status === "curated") return 3;
  if (status === "package_verified") return 2;
  return 0;
}

function typeEvidenceWeight(resource: Resource) {
  return Number(Boolean(resource.has_skill_md)) * 8
    + Number(Boolean(resource.has_mcp_manifest)) * 8
    + Number(Boolean(resource.has_github_action)) * 7
    + Number(Boolean(resource.has_project_manifest)) * 4
    + Number(Boolean(resource.has_package_json)) * 3
    + Number(Boolean(resource.artifact_path)) * 2;
}

function sourceWeight(resource: Resource) {
  if (resource.source === "github_live") return 6;
  if (resource.source === "mcp_registry") return 5;
  if (resource.source === "curated_seed" || resource.is_curated) return 5;
  if (resource.source === "npm_catalog") return 4;
  if (resource.source === "github_catalog") return 3;
  if (resource.source === "github_top_ai") return 0;
  return 2;
}

function hasMcpSignal(resource: Resource) {
  return /\b(mcp|model context protocol|model-context-protocol)\b/i.test(resourceText(resource));
}

function hasUiLibrarySignal(resource: Resource) {
  return /\b(component library|components|design system|shadcn|radix|tailwind ui|react ui|vue ui|ui library)\b/i.test(
    resourceText(resource)
  );
}

function resourceText(resource: Resource) {
  return `${resource.name} ${resource.description} ${resource.tags.join(" ")} ${resource.use_cases.join(" ")}`;
}

function normalizeRepositoryUrl(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^git\+/, "")
    .replace(/\.git$/, "")
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "");
}

function isGenericRepositoryUrl(value: string) {
  return /^https?:\/\/(www\.)?github\.com$/.test(value)
    || /^https?:\/\/(www\.)?(platform\.openai\.com|supabase\.com)\//.test(value);
}

function normalizeArtifact(value: string) {
  return value.trim().toLowerCase().replace(/\\/g, "/").replace(/^\/+/, "");
}

function getPackageIdentity(command: string) {
  const match = command.toLowerCase().match(/(?:npx(?:\s+-y)?|npm install)\s+([@a-z0-9._/-]+)/);
  return match?.[1]?.replace(/[^a-z0-9@._/-]+/g, "") ?? "";
}
