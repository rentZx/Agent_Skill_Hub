import assert from "node:assert/strict";
import { buildResourceModelV2, type LegacyResourceModelInput } from "../lib/resource-model-v2";

const moneyPrinter = buildResourceModelV2(resource({
  name: "MoneyPrinterTurbo",
  slug: "money-printer-turbo",
  type: "template_repo",
  repoUrl: "https://github.com/harry0703/MoneyPrinterTurbo",
  isCurated: true,
  hasProjectManifest: true,
  tags: ["short-video", "text-to-video"]
}));
assert.equal(moneyPrinter.artifact.kind, "project_template");
assert.equal(moneyPrinter.artifact.verificationStatus, "verified");
assert.equal(moneyPrinter.repository.canonicalUrl, "https://github.com/harry0703/MoneyPrinterTurbo");

const unverifiedPlugin = buildResourceModelV2(resource({
  name: "Popular AI Repository",
  slug: "popular-ai-repository",
  type: "github_plugin",
  repoUrl: "https://github.com/example/popular-ai",
  source: "github_top_ai",
  tags: ["ai"]
}));
assert.equal(unverifiedPlugin.artifact.kind, "developer_tool");
assert.equal(unverifiedPlugin.artifact.verificationStatus, "pending");
assert.equal(unverifiedPlugin.verificationRun.status, "partial");

const mcpServer = buildResourceModelV2(resource({
  name: "Recipe MCP",
  slug: "recipe-mcp",
  type: "mcp_server",
  repoUrl: "https://github.com/example/recipe-mcp",
  source: "mcp_registry",
  hasMcpManifest: true,
  tags: ["recipe", "mcp"]
}));
assert.equal(mcpServer.artifact.kind, "mcp_server");
assert.equal(mcpServer.artifact.verificationStatus, "verified");

const skillA = buildResourceModelV2(resource({
  name: "Skill A",
  slug: "skill-a",
  type: "agent_skill",
  repoUrl: "https://github.com/example/skill-pack/tree/main/skills/a",
  artifactPath: "skills/a/SKILL.md",
  hasSkillMd: true
}));
const skillB = buildResourceModelV2(resource({
  name: "Skill B",
  slug: "skill-b",
  type: "agent_skill",
  repoUrl: "https://github.com/example/skill-pack/blob/main/skills/b/SKILL.md",
  artifactPath: "skills/b/SKILL.md",
  hasSkillMd: true
}));
assert.equal(skillA.repository.canonicalUrl, skillB.repository.canonicalUrl);
assert.notEqual(skillA.artifact.artifactKey, skillB.artifact.artifactKey);

const awesomeList = buildResourceModelV2(resource({
  name: "Awesome Finance Skills",
  slug: "awesome-finance-skills",
  type: "github_plugin",
  repoUrl: "https://github.com/example/awesome-finance-skills",
  hasProjectManifest: true,
  tags: ["awesome-list", "finance"]
}));
assert.equal(awesomeList.artifact.kind, "awesome_list");
assert.equal(awesomeList.artifact.verificationStatus, "pending");

console.log("Resource model V2 benchmark passed.");

function resource(overrides: Partial<LegacyResourceModelInput>): LegacyResourceModelInput {
  const slug = overrides.slug ?? "resource";
  return {
    legacyResourceId: `${slug}-legacy-id`,
    slug,
    name: overrides.name ?? "Resource",
    type: overrides.type ?? "github_plugin",
    description: overrides.description ?? "Resource description",
    repoUrl: overrides.repoUrl ?? "https://github.com/example/resource",
    installCommand: overrides.installCommand ?? "",
    source: overrides.source ?? "github_catalog",
    riskLevel: overrides.riskLevel ?? "low",
    trustScore: overrides.trustScore ?? 80,
    fitScore: overrides.fitScore ?? 80,
    githubStars: overrides.githubStars ?? 100,
    githubForks: overrides.githubForks ?? 10,
    tags: overrides.tags ?? [],
    runKey: overrides.runKey ?? `benchmark:${slug}`,
    runSource: overrides.runSource ?? "benchmark",
    ...overrides
  };
}
