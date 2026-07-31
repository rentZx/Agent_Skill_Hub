import assert from "node:assert/strict";
import {
  getResourceVerification,
  isResourceRecommendationEligible,
  mergeCanonicalResources
} from "../lib/resource-verification";
import type { Resource, ResourceType } from "../lib/types";

const verifiedSkill = resource("Verified Skill", "agent_skill", "https://github.com/example/verified", {
  has_skill_md: true
});
const fakeSkill = resource("Generic Agent Repository", "agent_skill", "https://github.com/example/generic-agent");
const fakeMcp = resource("JavaGuide", "mcp_server", "https://github.com/example/javaguide", {
  source: "github_top_ai",
  tags: ["java", "interview"]
});
const npmMcp = resource("@example/mcp-server", "mcp_server", "https://github.com/example/mcp-server", {
  source: "npm_catalog",
  has_package_json: true,
  tags: ["mcp", "mcp-server"]
});
const curatedTemplate = resource("Curated Domain Template", "template_repo", "https://github.com/example/domain-template", {
  source: "curated_seed"
});
const evidencedTemplate = resource("Evidenced Domain Template", "template_repo", "https://github.com/example/evidenced-template", {
  source: "curated_seed",
  has_project_manifest: true
});
const verifiedLiveDataset = resource("Bird Audio Dataset", "github_plugin", "https://github.com/example/bird-audio", {
  source: "github_live",
  artifact_kind: "dataset",
  matched_capabilities: ["bird-sound-recognition"]
});

assert.equal(getResourceVerification(verifiedSkill).status, "verified");
assert(isResourceRecommendationEligible(verifiedSkill), "检测到 SKILL.md 的 Skill 应允许推荐");
assert(!isResourceRecommendationEligible(fakeSkill), "缺少 SKILL.md 的自动 Skill 不应进入推荐");
assert(!isResourceRecommendationEligible(fakeMcp), "缺少 MCP 证据的热门仓库不应进入推荐");
assert(isResourceRecommendationEligible(npmMcp), "具有 npm 包和 MCP 标识的服务器应允许推荐");
assert(!isResourceRecommendationEligible(curatedTemplate), "人工精选标记不能绕过结构证据门槛");
assert(isResourceRecommendationEligible(evidencedTemplate), "具有项目清单的资源应允许推荐");
assert(isResourceRecommendationEligible(verifiedLiveDataset), "具有数据文件和领域能力证据的联网数据集应允许推荐");

const verifiedRootSkill = resource("Root Skill", "agent_skill", "https://github.com/example/conflict", {
  has_skill_md: true,
  fit_score: 75
});
const conflictingTemplate = resource("Conflict Template", "template_repo", "https://github.com/example/conflict", {
  fit_score: 95,
  trust_score: 95
});
const mergedConflict = mergeCanonicalResources([conflictingTemplate, verifiedRootSkill]);
assert.equal(mergedConflict.length, 1, "同仓库根资源应稳定合并");
assert.equal(mergedConflict[0]?.type, "agent_skill", "类型证据应优先于基础分");

const skillA = resource("Skill A", "agent_skill", "https://github.com/example/skill-pack", {
  has_skill_md: true,
  artifact_path: "skills/a/SKILL.md"
});
const skillB = resource("Skill B", "agent_skill", "https://github.com/example/skill-pack", {
  has_skill_md: true,
  artifact_path: "skills/b/SKILL.md"
});
assert.equal(
  mergeCanonicalResources([skillA, skillB]).length,
  2,
  "同仓库不同 SKILL.md 路径必须分别保留"
);

const curatedUi = resource("shadcn/ui", "ui_component", "https://github.com/shadcn-ui/ui", {
  source: "curated_seed",
  fit_score: 80
});
const unverifiedUi = resource("ui", "ui_component", "https://github.com/shadcn-ui/ui", {
  source: "github_catalog",
  fit_score: 95,
  trust_score: 95
});
const mergedUi = mergeCanonicalResources([unverifiedUi, curatedUi]);
assert.equal(mergedUi.length, 1);
assert.equal(mergedUi[0]?.name, "ui", "人工精选标记不应覆盖证据与基础质量排序");

const verifiedV2 = resource("FunASR", "github_plugin", "https://github.com/modelscope/FunASR", {
  source: "resource_model_v2",
  verification_status: "verified",
  artifact_kind: "library",
  has_project_manifest: true,
  matched_capabilities: ["speech-to-text"],
  tags: ["speech-to-text", "chinese-asr"]
});
const noisyLiveDuplicate = resource("FunASR Live", "github_plugin", "https://github.com/modelscope/FunASR", {
  source: "github_live",
  has_project_manifest: true,
  matched_capabilities: ["domain-data"],
  tags: ["stock-market", "real-time"]
});
const mergedV2 = mergeCanonicalResources([noisyLiveDuplicate, verifiedV2]);
assert.equal(mergedV2.length, 1);
assert.equal(
  mergedV2[0]?.source,
  "resource_model_v2",
  "联网发现不得覆盖同仓库的 V2 已验证证据。"
);

console.log("Resource verification benchmark passed.");

function resource(
  name: string,
  type: ResourceType,
  repoUrl: string,
  overrides: Partial<Resource> = {}
): Resource {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return {
    id: `${slug}-${type}`,
    slug,
    name,
    type,
    description: `${name} project resource`,
    tags: [],
    supported_agents: ["Codex"],
    install_command: type === "mcp_server" ? `npx -y ${slug}` : `Review ${repoUrl}`,
    use_cases: [],
    risk_level: "low",
    trust_score: 80,
    fit_score: 80,
    repo_url: repoUrl,
    source: "github_catalog",
    last_updated: "2026-07-29",
    ...overrides
  };
}
