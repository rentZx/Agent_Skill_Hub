import "server-only";

import { analyzeWithDeepSeek, rerankWithDeepSeek } from "@/lib/deepseek";
import { buildCapabilityGraph } from "@/lib/capability-engine";
import { discoverGitHubResources } from "@/lib/github-discovery-core";
import { analyzeProject, buildAnalyzerPrompt } from "@/lib/project-analyzer";
import type { AnalyzerResult } from "@/lib/project-analyzer";
import { rebuildCodexPrompt } from "@/lib/recommendation";
import { getLocalizedRecommendationReason } from "@/lib/resource-localization";
import type { Resource } from "@/lib/types";

export async function analyzeProjectWithAI(input: string, resources: Resource[]): Promise<AnalyzerResult & { source: "deepseek" | "rules"; discoveredCount: number }> {
  const initial = analyzeProject(input, resources);
  const preliminaryGraph = buildCapabilityGraph(input, {
    projectType: initial.analysis.projectType,
    coreFeatures: initial.analysis.coreFeatures,
    tags: initial.analysis.tags
  });
  const [ai, preliminaryDiscovered] = await Promise.all([
    analyzeSafely(input),
    discoverSafely(input, initial.analysis.tags, resources, preliminaryGraph)
  ]);

  const capabilityGraph = buildCapabilityGraph(input, {
    projectType: ai?.projectType ?? initial.analysis.projectType,
    coreFeatures: ai?.coreFeatures?.length ? ai.coreFeatures : initial.analysis.coreFeatures,
    tags: Array.from(new Set([...initial.analysis.tags, ...(ai?.tags ?? [])])),
    capabilities: ai?.capabilities,
    constraints: ai?.constraints,
    searchQueries: ai?.searchQueries
  });

  let discovered = preliminaryDiscovered;
  if (ai && !preliminaryDiscovered.some((resource) => (resource.ai_recommendation_weight ?? 0) >= 100)) {
    const discoveryTags = Array.from(new Set([
      ...initial.analysis.tags,
      ...(ai?.tags ?? [])
    ]));
    discovered = await discoverSafely(input, discoveryTags, resources, capabilityGraph);
  }

  const candidateResources = mergeResources(resources, discovered);
  const fallback = analyzeProject(input, candidateResources, {}, capabilityGraph);

  try {
    if (!ai) {
      const evidenceBacked = applyEvidenceFallback(fallback.recommendation);
      const recommendation = {
        ...evidenceBacked,
        codexPrompt: rebuildCodexPrompt(input, evidenceBacked)
      };
      return {
        ...fallback,
        source: "rules",
        discoveredCount: discovered.length,
        recommendation: {
          ...recommendation,
          codexPrompt: buildAnalyzerPrompt(input, fallback.analysis, recommendation.codexPrompt)
        }
      };
    }
    const enriched = analyzeProject(input, candidateResources, {
      industry: ai.industry,
      projectType: ai.projectType,
      platform: ai.platform,
      targetUsers: ai.targetUsers,
      coreFeatures: ai.coreFeatures,
      frontend: ai.frontend,
      backend: ai.backend,
      database: ai.database,
      orm: ai.orm,
      deploy: ai.deploy,
      difficulty: ai.difficulty,
      tags: ai.tags
    }, capabilityGraph);
    const reranked = await rerankRecommendation(input, enriched.recommendation);
    const analysis = {
      ...enriched.analysis,
      ...(ai.industry ? { industry: ai.industry } : {}),
      ...(ai.projectType ? { projectType: ai.projectType } : {}),
      ...(ai.platform ? { platform: ai.platform } : {}),
      ...(ai.targetUsers ? { targetUsers: ai.targetUsers } : {}),
      ...(ai.coreFeatures?.length ? { coreFeatures: ai.coreFeatures } : {}),
      ...(ai.frontend ? { frontend: ai.frontend } : {}),
      ...(ai.backend ? { backend: ai.backend } : {}),
      ...(ai.database ? { database: ai.database } : {}),
      ...(ai.orm ? { orm: ai.orm } : {}),
      ...(ai.deploy ? { deploy: ai.deploy } : {}),
      ...(ai.difficulty ? { difficulty: ai.difficulty } : {}),
      tags: Array.from(new Set([...enriched.analysis.tags, ...(ai.tags ?? [])]))
    };
    const recommendation = {
      ...reranked,
      codexPrompt: rebuildCodexPrompt(input, reranked)
    };
    return {
      ...enriched,
      source: "deepseek",
      discoveredCount: discovered.length,
      recommendation: {
        ...recommendation,
        codexPrompt: buildAnalyzerPrompt(input, analysis, recommendation.codexPrompt)
      },
      analysis
    };
  } catch (error) {
    console.warn("DeepSeek analysis failed, using rules fallback.", error);
    return { ...fallback, source: "rules", discoveredCount: discovered.length };
  }
}

async function analyzeSafely(input: string) {
  try {
    return await analyzeWithDeepSeek(input);
  } catch (error) {
    console.warn("DeepSeek analysis failed, using rules tags.", error);
    return null;
  }
}

async function discoverSafely(
  input: string,
  tags: string[],
  resources: Resource[],
  capabilityGraph: ReturnType<typeof buildCapabilityGraph>
) {
  try {
    return await discoverGitHubResources(input, tags, resources, {
      capabilities: capabilityGraph.capabilities,
      searchQueries: capabilityGraph.searchQueries
    });
  } catch (error) {
    console.warn("GitHub discovery failed, keeping database resources.", error);
    return [];
  }
}

function mergeResources(catalog: Resource[], discovered: Resource[]) {
  const merged = new Map(catalog.map((resource) => {
    const normalized = normalizeOfficialResourceName(resource);
    return [normalized.repo_url || normalized.id, normalized];
  }));
  discovered.forEach((resource) => {
    const normalized = normalizeOfficialResourceName(resource);
    merged.set(normalized.repo_url || normalized.id, normalized);
  });
  return Array.from(merged.values());
}

function normalizeOfficialResourceName(resource: Resource): Resource {
  const repoUrl = resource.repo_url.toLowerCase().replace(/\/+$/, "");
  return repoUrl.endsWith("github.com/shadcn-ui/ui")
    ? { ...resource, name: "shadcn/ui" }
    : resource;
}

async function rerankRecommendation(input: string, recommendation: AnalyzerResult["recommendation"]) {
  const candidates = selectRerankCandidates(recommendation).map((item) => ({
    id: item.resource.id,
    name: item.resource.name,
    type: item.resource.type,
    description: item.resource.description,
    tags: item.resource.tags,
    evidence: item.resource.evidence_summary,
    matchedCapabilities: Array.from(new Set([
      ...item.matchedCapabilityIds,
      ...(item.resource.matched_capabilities ?? [])
    ])),
    trust: item.resource.trust_score,
    fit: item.resource.fit_score,
    risk: item.resource.risk_level
  }));
  if (candidates.length === 0) return recommendation;

  try {
    const batches = chunk(candidates, 6);
    const results = await Promise.allSettled(
      batches.map((batch) => rerankWithDeepSeek(
        input,
        batch,
        recommendation.modules.map((module) => ({
          id: module.id,
          label: module.label,
          description: module.description,
          priority: module.priority ?? "optional",
          resourceRoles: module.resourceRoles ?? []
        }))
      ))
    );
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        console.warn(`DeepSeek rerank batch ${index + 1} failed.`, result.reason);
      }
    });
    const scores = results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
    if (scores.length === 0) return applyEvidenceFallback(recommendation);

    const scoreMap = new Map(scores.map((item) => [item.id, item]));
    const originalGroupGaps = new Set(
      recommendation.groups.map((group) => group.gap).filter((gap): gap is string => Boolean(gap))
    );
    const retainedGaps = recommendation.gaps.filter((gap) => !originalGroupGaps.has(gap));
    const rerankedGroups = recommendation.groups.map((group) => {
      const items = group.items.flatMap((item) => {
        const rerank = scoreMap.get(item.resource.id);
        if (!rerank) return hasStrongRepositoryEvidence(item) ? [item] : [];
        if (!shouldKeepRerankedItem(item, rerank, recommendation.keywords, recommendation.modules)) return [];

        const score = Math.round(item.score * 0.55 + rerank.score * 0.45);
        return [{
          ...item,
          score,
          why: getLocalizedRecommendationReason(item.resource, score, rerank.reason)
        }];
      }).sort((a, b) => b.score - a.score);

      return {
        ...group,
        items,
        gap: items.length > 0
          ? undefined
          : group.gap ?? `当前需求暂无${group.title}的强匹配资源。`
      };
    });
    const groups = addFoundationalUiFallback(rerankedGroups, recommendation);

    return {
      ...recommendation,
      groups,
      gaps: Array.from(new Set(retainedGaps))
    };
  } catch (error) {
    console.warn("DeepSeek rerank failed, keeping evidence-backed resources only.", error);
    return applyEvidenceFallback(recommendation);
  }
}

function selectRerankCandidates(recommendation: AnalyzerResult["recommendation"]) {
  const firstByGroup = recommendation.groups.flatMap((group) => group.items.slice(0, 1));
  const selectedIds = new Set(firstByGroup.map((item) => item.resource.id));
  const remaining = recommendation.groups
    .flatMap((group) => group.items)
    .filter((item) => !selectedIds.has(item.resource.id))
    .filter((item, index, items) =>
      items.findIndex((candidate) => candidate.resource.id === item.resource.id) === index
    )
    .sort((left, right) => {
      const leftEvidence = left.resource.evidence_summary ? 12 : 0;
      const rightEvidence = right.resource.evidence_summary ? 12 : 0;
      const leftDomain = left.matchKind === "domain" ? 8 : 0;
      const rightDomain = right.matchKind === "domain" ? 8 : 0;
      return right.score + rightEvidence + rightDomain - (left.score + leftEvidence + leftDomain);
    });

  return [...firstByGroup, ...remaining].slice(0, 20);
}

function shouldKeepRerankedItem(
  item: AnalyzerResult["recommendation"]["groups"][number]["items"][number],
  rerank: Awaited<ReturnType<typeof rerankWithDeepSeek>>[number],
  projectKeywords: string[],
  modules: AnalyzerResult["recommendation"]["modules"]
) {
  const minimumScore = item.matchKind === "baseline" ? 60 : 55;
  const negativeReason = /不建议使用|无直接关系|没有直接关系|不相关|不匹配|不适合|不具备.+功能|缺少.+能力|缺少领域特定|缺少具体领域|仅.{0,8}通用/i.test(rerank.reason);
  const importantIds = new Set(
    modules
      .filter((module) => module.priority === "core" || module.priority === "required")
      .map((module) => module.id)
  );
  const deterministicMatches = new Set(item.matchedCapabilityIds);
  const verifiedCoverage = rerank.coveredCapabilities.some((id) =>
    importantIds.has(id) && deterministicMatches.has(id)
  );
  return rerank.recommended
    && rerank.score >= minimumScore
    && !negativeReason
    && verifiedCoverage
    && hasDirectDomainSignal(item, projectKeywords);
}

function applyEvidenceFallback(recommendation: AnalyzerResult["recommendation"]) {
  const groups = recommendation.groups.map((group) => {
    const items = group.items.filter(hasStrongRepositoryEvidence);
    return {
      ...group,
      items,
      gap: items.length > 0
        ? undefined
        : group.gap ?? `当前需求暂无${group.title}的强匹配资源。`
    };
  });

  return {
    ...recommendation,
    groups,
    gaps: Array.from(new Set(recommendation.gaps))
  };
}

function hasStrongRepositoryEvidence(
  item: AnalyzerResult["recommendation"]["groups"][number]["items"][number]
) {
  return item.matchKind !== "baseline"
    && (
      (item.resource.ai_recommendation_weight ?? 0) >= 100
      || (
        (item.resource.ai_recommendation_weight ?? 0) >= 95
        && Boolean(item.resource.evidence_summary)
        && (item.resource.matched_capabilities?.length ?? 0) > 0
      )
    );
}

function addFoundationalUiFallback(
  groups: AnalyzerResult["recommendation"]["groups"],
  original: AnalyzerResult["recommendation"]
) {
  const uiGroup = groups.find((group) => group.id === "ui-libraries");
  if (!uiGroup || uiGroup.items.length > 0) return groups;

  const originalUiGroup = original.groups.find((group) => group.id === "ui-libraries");
  const candidate = originalUiGroup?.items.find((item) =>
    item.resource.risk_level !== "high"
    && (
      item.resource.name.toLowerCase() === "shadcn/ui"
      || item.resource.repo_url.toLowerCase().replace(/\/+$/, "").endsWith("github.com/shadcn-ui/ui")
    )
  ) ?? originalUiGroup?.items.find((item) =>
    item.resource.risk_level !== "high"
    && item.resource.tags.some((tag) => tag.toLowerCase() === "shadcn")
  ) ?? originalUiGroup?.items.find((item) => item.resource.risk_level === "low");
  if (!candidate) return groups;

  const score = Math.min(82, Math.max(65, Math.round(candidate.score)));
  const featureLabels = original.understanding.coreFeatures.slice(0, 3).join("、");
  const fallback = {
    ...candidate,
    score,
    matchKind: "baseline" as const,
    why: getLocalizedRecommendationReason(
      candidate.resource,
      score,
      `提供表单、筛选、弹窗和响应式布局，可承载${featureLabels || "核心业务流程"}；仅负责界面，不包含业务算法。`
    )
  };

  return groups.map((group) => group.id === "ui-libraries"
    ? { ...group, items: [fallback], gap: undefined }
    : group
  );
}

const broadCapabilityIds = new Set([
  "domain-data",
  "real-time-integration",
  "personalized-recommendation",
  "visualization",
  "workflow-automation",
  "document-processing",
  "web-research",
  "domain-rules",
  "ui-components",
  "database-storage",
  "automated-testing",
  "deployment",
  "agent-workflow"
]);

const genericProjectKeywords = new Set([
  "ai", "agent", "agents", "app", "application", "web", "website", "system", "platform", "project",
  "tool", "tools", "skill", "skills", "plugin", "plugins", "github", "api", "database", "frontend", "backend",
  "react", "next", "nextjs", "next.js", "node", "nodejs", "python", "typescript", "javascript", "docker",
  "vercel", "saas", "dashboard", "workflow", "automation", "recommendation", "interactive", "management",
  "table", "data-table", "form", "forms", "filter", "filters", "component", "components", "layout", "responsive"
]);

function hasDirectDomainSignal(
  item: AnalyzerResult["recommendation"]["groups"][number]["items"][number],
  projectKeywords: string[]
) {
  const haystack = [
    item.resource.name,
    item.resource.description,
    ...item.resource.tags,
    ...item.resource.use_cases
  ].join(" ").toLowerCase();
  const hasProjectKeyword = projectKeywords.some((keyword) => {
    const normalized = keyword.toLowerCase().trim();
    return normalized.length >= 3
      && normalized.length <= 40
      && !genericProjectKeywords.has(normalized)
      && (
        haystack.includes(normalized)
        || haystack.includes(normalized.replace(/[-_]+/g, " "))
      );
  });
  if (item.resource.type === "ui_component") {
    return item.resource.name.toLowerCase() === "shadcn/ui"
      || item.resource.repo_url.toLowerCase().replace(/\/+$/, "").endsWith("github.com/shadcn-ui/ui")
      || hasProjectKeyword;
  }
  if ((item.resource.ai_recommendation_weight ?? 0) >= 100) return true;

  const capabilityIds = new Set([
    ...item.matchedCapabilityIds,
    ...(item.resource.matched_capabilities ?? [])
  ]);
  if (Array.from(capabilityIds).some((id) => !broadCapabilityIds.has(id))) return true;

  return hasProjectKeyword;
}

function chunk<T>(items: T[], size: number) {
  return Array.from(
    { length: Math.ceil(items.length / size) },
    (_, index) => items.slice(index * size, (index + 1) * size)
  );
}
