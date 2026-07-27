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
  let ai: Awaited<ReturnType<typeof analyzeWithDeepSeek>> = null;
  try {
    ai = await analyzeWithDeepSeek(input);
  } catch (error) {
    console.warn("DeepSeek analysis failed, using rules tags.", error);
  }

  const capabilityGraph = buildCapabilityGraph(input, {
    projectType: ai?.projectType ?? initial.analysis.projectType,
    coreFeatures: ai?.coreFeatures?.length ? ai.coreFeatures : initial.analysis.coreFeatures,
    tags: Array.from(new Set([...initial.analysis.tags, ...(ai?.tags ?? [])])),
    capabilities: ai?.capabilities,
    constraints: ai?.constraints,
    searchQueries: ai?.searchQueries
  });

  let discovered: Resource[] = [];
  try {
    const discoveryTags = Array.from(new Set([
      ...initial.analysis.tags,
      ...(ai?.tags ?? [])
    ]));
    discovered = await discoverGitHubResources(input, discoveryTags, resources, {
      capabilities: capabilityGraph.capabilities,
      searchQueries: capabilityGraph.searchQueries
    });
  } catch (error) {
    console.warn("GitHub discovery failed, keeping database resources.", error);
  }

  const candidateResources = mergeResources(resources, discovered);
  const fallback = analyzeProject(input, candidateResources, {}, capabilityGraph);

  try {
    if (!ai) return { ...fallback, source: "rules", discoveredCount: discovered.length };
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

function mergeResources(catalog: Resource[], discovered: Resource[]) {
  const merged = new Map(catalog.map((resource) => [resource.repo_url || resource.id, resource]));
  discovered.forEach((resource) => merged.set(resource.repo_url || resource.id, resource));
  return Array.from(merged.values());
}

async function rerankRecommendation(input: string, recommendation: AnalyzerResult["recommendation"]) {
  const candidates = selectRerankCandidates(recommendation).map((item) => ({
    id: item.resource.id,
    name: item.resource.name,
    type: item.resource.type,
    description: item.resource.description,
    tags: item.resource.tags,
    evidence: item.resource.evidence_summary,
    matchedCapabilities: item.resource.matched_capabilities,
    trust: item.resource.trust_score,
    fit: item.resource.fit_score,
    risk: item.resource.risk_level
  }));
  if (candidates.length === 0) return recommendation;

  try {
    const scores = await rerankWithDeepSeek(input, candidates);
    if (scores.length === 0) return recommendation;

    const scoreMap = new Map(scores.map((item) => [item.id, item]));
    const originalGroupGaps = new Set(
      recommendation.groups.map((group) => group.gap).filter((gap): gap is string => Boolean(gap))
    );
    const retainedGaps = recommendation.gaps.filter((gap) => !originalGroupGaps.has(gap));
    const groups = recommendation.groups.map((group) => {
      const items = group.items.flatMap((item) => {
        const rerank = scoreMap.get(item.resource.id);
        if (!rerank) {
          return item.matchKind === "domain" ? [item] : [];
        }
        if (!shouldKeepRerankedItem(item, rerank)) return [];

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

    return {
      ...recommendation,
      groups,
      gaps: Array.from(new Set([
        ...retainedGaps,
        ...groups.filter((group) => group.items.length === 0).map((group) => group.gap).filter(Boolean) as string[]
      ]))
    };
  } catch (error) {
    console.warn("DeepSeek rerank failed, keeping rule scores.", error);
    return recommendation;
  }
}

function selectRerankCandidates(recommendation: AnalyzerResult["recommendation"]) {
  const firstByGroup = recommendation.groups.flatMap((group) => group.items.slice(0, 1));
  const selectedIds = new Set(firstByGroup.map((item) => item.resource.id));
  const remaining = recommendation.groups
    .flatMap((group) => group.items)
    .filter((item) => !selectedIds.has(item.resource.id))
    .sort((left, right) => {
      const leftEvidence = left.resource.evidence_summary ? 12 : 0;
      const rightEvidence = right.resource.evidence_summary ? 12 : 0;
      const leftDomain = left.matchKind === "domain" ? 8 : 0;
      const rightDomain = right.matchKind === "domain" ? 8 : 0;
      return right.score + rightEvidence + rightDomain - (left.score + leftEvidence + leftDomain);
    });

  return [...firstByGroup, ...remaining].slice(0, 18);
}

function shouldKeepRerankedItem(
  item: AnalyzerResult["recommendation"]["groups"][number]["items"][number],
  rerank: Awaited<ReturnType<typeof rerankWithDeepSeek>>[number]
) {
  const curatedDomain = item.matchKind === "domain" && (item.resource.ai_recommendation_weight ?? 0) >= 80;
  const minimumScore = curatedDomain ? 35 : item.matchKind === "baseline" ? 40 : 50;
  const negativeReason = /不建议使用|无直接关系|没有直接关系|不相关|不匹配|不适合|不具备.+功能|缺少.+能力/i.test(rerank.reason);
  return (rerank.recommended || curatedDomain) && rerank.score >= minimumScore && !negativeReason;
}
