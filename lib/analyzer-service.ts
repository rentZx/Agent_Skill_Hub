import "server-only";

import { analyzeWithDeepSeek, rerankWithDeepSeek } from "@/lib/deepseek";
import { buildCapabilityGraph } from "@/lib/capability-engine";
import { discoverGitHubResources } from "@/lib/github-discovery-core";
import { analyzeProject, buildAnalyzerPrompt, hasKnownProjectRule } from "@/lib/project-analyzer";
import type { AnalyzerResult } from "@/lib/project-analyzer";
import {
  hasDomainCapabilityEvidence,
  rebuildCodexPrompt
} from "@/lib/recommendation";
import { getLocalizedRecommendationReason } from "@/lib/resource-localization";
import { assessRequirementClarity } from "@/lib/requirement-clarity";
import {
  getResourceVerification,
  mergeCanonicalResources
} from "@/lib/resource-verification";
import type { Resource } from "@/lib/types";

type AnalyzerRuntimeResult = AnalyzerResult & {
  source: "deepseek" | "rules";
  discoveredCount: number;
  selectedDiscoveredCount: number;
};

export async function analyzeProjectWithAI(input: string, resources: Resource[]): Promise<AnalyzerRuntimeResult> {
  const clarity = assessRequirementClarity(input);
  const isLowConfidence = clarity.confidence === "low";
  const initial = analyzeProject(input, resources);
  const graphTags = isLowConfidence
    ? initial.analysis.tags.filter((tag) => /(food|餐饮|美食)/i.test(tag))
    : initial.analysis.tags;
  const preliminaryGraph = buildCapabilityGraph(input, {
    projectType: initial.analysis.projectType,
    coreFeatures: initial.analysis.coreFeatures,
    tags: graphTags
  });
  const [rawAi, preliminaryDiscovered] = await Promise.all([
    analyzeSafely(input),
    discoverSafely(input, initial.analysis.tags, resources, preliminaryGraph)
  ]);
  const ai = alignAiAnalysisWithKnownDomain(input, rawAi, initial.analysis);

  const capabilityGraph = buildCapabilityGraph(input, {
    projectType: isLowConfidence ? initial.analysis.projectType : ai?.projectType ?? initial.analysis.projectType,
    coreFeatures: isLowConfidence
      ? initial.analysis.coreFeatures
      : ai?.coreFeatures?.length ? ai.coreFeatures : initial.analysis.coreFeatures,
    tags: isLowConfidence
      ? graphTags
      : Array.from(new Set([...initial.analysis.tags, ...(ai?.tags ?? [])])),
    capabilities: isLowConfidence ? undefined : ai?.capabilities,
    constraints: isLowConfidence ? undefined : ai?.constraints,
    searchQueries: isLowConfidence ? preliminaryGraph.searchQueries : ai?.searchQueries
  });

  let discovered = preliminaryDiscovered;
  if (ai && !preliminaryDiscovered.some((resource) => (resource.ai_recommendation_weight ?? 0) >= 100)) {
    const discoveryTags = isLowConfidence
      ? graphTags
      : Array.from(new Set([
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
        selectedDiscoveredCount: countSelectedDiscoveredResources(recommendation, discovered),
        recommendation: {
          ...recommendation,
          codexPrompt: buildAnalyzerPrompt(input, fallback.analysis, recommendation.codexPrompt, recommendation.clarity)
        }
      };
    }
    const enriched = analyzeProject(input, candidateResources, isLowConfidence
      ? {
          industry: ai.industry
        }
      : {
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
    const catalogRecommendation = analyzeProject(
      input,
      resources,
      {},
      preliminaryGraph
    ).recommendation;
    const groundedRecommendation = {
      ...reranked,
      groups: mergeCatalogBaselineItems(
        reranked.groups,
        catalogRecommendation
      )
    };
    const analysis = isLowConfidence ? enriched.analysis : {
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
      ...groundedRecommendation,
      codexPrompt: rebuildCodexPrompt(input, groundedRecommendation)
    };
    return {
      ...enriched,
      source: "deepseek",
      discoveredCount: discovered.length,
      selectedDiscoveredCount: countSelectedDiscoveredResources(recommendation, discovered),
      recommendation: {
        ...recommendation,
        codexPrompt: buildAnalyzerPrompt(input, analysis, recommendation.codexPrompt, recommendation.clarity)
      },
      analysis
    };
  } catch (error) {
    console.warn("DeepSeek analysis failed, using rules fallback.", error);
    return {
      ...fallback,
      source: "rules",
      discoveredCount: discovered.length,
      selectedDiscoveredCount: countSelectedDiscoveredResources(fallback.recommendation, discovered)
    };
  }
}

function mergeCatalogBaselineItems(
  enrichedGroups: AnalyzerResult["recommendation"]["groups"],
  catalogBaseline: AnalyzerResult["recommendation"]
) {
  return enrichedGroups.map((group) => {
    const baselineGroup = catalogBaseline.groups.find((candidate) => candidate.id === group.id);
    if (!baselineGroup) return group;

    const merged = new Map(group.items.map((item) => [item.resource.id, item]));
    for (const item of baselineGroup.items) {
      if (!merged.has(item.resource.id)) merged.set(item.resource.id, item);
    }
    const items = Array.from(merged.values())
      .sort((left, right) => right.score - left.score)
      .slice(0, 4);

    return {
      ...group,
      items,
      gap: items.length > 0 ? undefined : group.gap
    };
  });
}

function countSelectedDiscoveredResources(
  recommendation: AnalyzerResult["recommendation"],
  discovered: Resource[]
) {
  const discoveredIds = new Set(discovered.map((resource) => resource.id));
  const selectedIds = recommendation.groups
    .filter((group) => group.id !== "risk-alerts")
    .flatMap((group) => group.items)
    .map((item) => item.resource.id)
    .filter((id) => discoveredIds.has(id));

  return new Set(selectedIds).size;
}

async function analyzeSafely(input: string) {
  try {
    return await analyzeWithDeepSeek(input);
  } catch (error) {
    console.warn("DeepSeek analysis failed, using rules tags.", error);
    return null;
  }
}

function alignAiAnalysisWithKnownDomain(
  input: string,
  ai: Awaited<ReturnType<typeof analyzeWithDeepSeek>>,
  ruleAnalysis: AnalyzerResult["analysis"]
) {
  if (!ai || !hasKnownProjectRule(input)) return ai;
  const shortVideoIntent = isShortVideoIntent(input);
  const searchQueries = shortVideoIntent
    ? (ai.searchQueries ?? []).filter((query) =>
        /(video|script|footage|voiceover|text.to.speech|subtitle|caption|ffmpeg|moviepy|remotion)/i.test(query)
      )
    : ai.searchQueries;

  return {
    ...ai,
    industry: ruleAnalysis.industry,
    projectType: ruleAnalysis.projectType,
    targetUsers: ruleAnalysis.targetUsers,
    coreFeatures: ruleAnalysis.coreFeatures,
    capabilities: shortVideoIntent
      ? (ai.capabilities ?? []).filter((capability) => {
          const source = `${capability.id ?? ""} ${capability.label ?? ""} ${(capability.keywords ?? []).join(" ")}`.toLowerCase();
          return !/(conversational|chat|message.storage|real.time.communication|user.authentication|natural.language.query|tool.calling|function.calling)/i.test(source);
        })
      : ai.capabilities,
    searchQueries
  };
}

function isShortVideoIntent(input: string) {
  return /(短视频|视频生成|文生视频|文本转视频|视频合成|ai.?视频|ai.?video|short.?video|text.to.video|video.generation)/i.test(input);
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
  return mergeCanonicalResources(
    [...catalog, ...discovered].map(normalizeOfficialResourceName)
  );
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
        if (!rerank) {
          return hasStrongRepositoryEvidence(item, recommendation.modules, recommendation.keywords) ? [item] : [];
        }
        if (!shouldKeepRerankedItem(item, rerank, recommendation.keywords, recommendation.modules)) {
          return hasStrongRepositoryEvidence(item, recommendation.modules, recommendation.keywords) ? [item] : [];
        }

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
    const evidencePreservedGroups = preserveEvidenceBackedCoreItems(
      rerankedGroups,
      recommendation
    );
    const groups = recommendation.clarity.confidence === "low"
      ? evidencePreservedGroups
      : addFoundationalUiFallback(evidencePreservedGroups, recommendation);

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

function preserveEvidenceBackedCoreItems(
  rerankedGroups: AnalyzerResult["recommendation"]["groups"],
  original: AnalyzerResult["recommendation"]
) {
  return rerankedGroups.map((group) => {
    const originalGroup = original.groups.find((candidate) => candidate.id === group.id);
    if (!originalGroup) return group;

    const evidenceBacked = originalGroup.items.filter((item) =>
      hasStrongRepositoryEvidence(item, original.modules, original.keywords)
    );
    const merged = new Map(group.items.map((item) => [item.resource.id, item]));
    for (const item of evidenceBacked) {
      if (!merged.has(item.resource.id)) merged.set(item.resource.id, item);
    }
    const items = Array.from(merged.values())
      .sort((left, right) => right.score - left.score)
      .slice(0, 4);

    return {
      ...group,
      items,
      gap: items.length > 0 ? undefined : group.gap
    };
  });
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
    && hasDirectDomainSignal(item, projectKeywords, false, modules);
}

function applyEvidenceFallback(recommendation: AnalyzerResult["recommendation"]) {
  const groups = recommendation.groups.map((group) => {
    const items = group.items.filter((item) =>
      hasStrongRepositoryEvidence(item, recommendation.modules, recommendation.keywords)
    );
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
  item: AnalyzerResult["recommendation"]["groups"][number]["items"][number],
  modules: AnalyzerResult["recommendation"]["modules"],
  projectKeywords: string[]
) {
  if (item.matchKind === "baseline" || item.resource.risk_level === "high") return false;
  const verification = getResourceVerification(item.resource);
  const coreIds = new Set(
    modules
      .filter((module) => module.priority === "core")
      .map((module) => module.id)
  );
  const deterministicCoverage = item.matchedCapabilityIds.some((id) => coreIds.has(id));
  const specificDeterministicCoverage = item.matchedCapabilityIds.some((id) =>
    coreIds.has(id) && !broadCapabilityIds.has(id)
  );
  const curatedLiveEvidence = verification.recommendationEligible
    && item.matchKind === "domain"
    && item.score >= 65
    && deterministicCoverage
    && (
      specificDeterministicCoverage
      || hasDirectDomainSignal(item, projectKeywords, true, modules)
    );
  const inspectedLiveEvidence = (item.resource.ai_recommendation_weight ?? 0) >= 95
    && Boolean(item.resource.evidence_summary)
    && (item.resource.matched_capabilities?.length ?? 0) > 0
    && hasDirectDomainSignal(item, projectKeywords, true, modules);

  return curatedLiveEvidence || inspectedLiveEvidence;
}

function addFoundationalUiFallback(
  groups: AnalyzerResult["recommendation"]["groups"],
  original: AnalyzerResult["recommendation"]
) {
  const uiGroup = groups.find((group) => group.id === "ui-libraries");
  if (!uiGroup || uiGroup.items.length > 0) return groups;
  const hasEvidenceBackedDomainResource = groups
    .filter((group) => group.id !== "risk-alerts")
    .some((group) => group.items.some((item) =>
      item.matchKind === "domain" && hasDomainCapabilityEvidence(item)
    ));
  if (!hasEvidenceBackedDomainResource) return groups;

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

const genericDomainSignalTokens = new Set([
  "ai", "audio", "classification", "data", "detection", "display", "extraction", "feature",
  "file", "image", "model", "preprocessing", "processing", "recognition", "result", "software",
  "speech", "system", "tool", "upload", "voice"
]);

function hasDirectDomainSignal(
  item: AnalyzerResult["recommendation"]["groups"][number]["items"][number],
  projectKeywords: string[],
  requireProjectKeyword = false,
  modules: AnalyzerResult["recommendation"]["modules"] = []
) {
  const haystack = [
    item.resource.name,
    item.resource.description,
    ...item.resource.tags,
    ...item.resource.use_cases
  ].join(" ").toLowerCase();
  const domainKeywords = Array.from(new Set([
    ...projectKeywords,
    ...modules.flatMap((module) => module.keywords)
  ]));
  const hasProjectKeyword = domainKeywords.some((keyword) => {
    const normalized = keyword.toLowerCase().trim();
    return normalized.length >= 3
      && normalized.length <= 40
      && !genericProjectKeywords.has(normalized)
      && isSpecificDomainKeyword(normalized)
      && matchesDomainKeyword(haystack, normalized);
  });
  if (item.resource.type === "ui_component") {
    return item.resource.name.toLowerCase() === "shadcn/ui"
      || item.resource.repo_url.toLowerCase().replace(/\/+$/, "").endsWith("github.com/shadcn-ui/ui")
      || hasProjectKeyword;
  }
  if (requireProjectKeyword) return hasProjectKeyword;
  if ((item.resource.ai_recommendation_weight ?? 0) >= 100) return true;

  const capabilityIds = new Set([
    ...item.matchedCapabilityIds,
    ...(item.resource.matched_capabilities ?? [])
  ]);
  if (Array.from(capabilityIds).some((id) => !broadCapabilityIds.has(id))) return true;

  return hasProjectKeyword;
}

function isSpecificDomainKeyword(keyword: string) {
  if (/[\u4e00-\u9fff]/.test(keyword)) return true;
  const tokens = keyword.split(/[^a-z0-9]+/).filter(Boolean);
  return tokens.some((token) => !genericDomainSignalTokens.has(token));
}

function matchesDomainKeyword(haystack: string, keyword: string) {
  if (/[\u4e00-\u9fff]/.test(keyword)) return haystack.includes(keyword);
  const haystackTokens = haystack.split(/[^a-z0-9]+/).filter(Boolean);
  const keywordTokens = keyword.split(/[^a-z0-9]+/).filter(Boolean);
  if (keywordTokens.length === 0) return false;
  return keywordTokens.every((token) => haystackTokens.includes(token));
}

function chunk<T>(items: T[], size: number) {
  return Array.from(
    { length: Math.ceil(items.length / size) },
    (_, index) => items.slice(index * size, (index + 1) * size)
  );
}
