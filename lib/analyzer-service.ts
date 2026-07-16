import "server-only";

import { analyzeWithDeepSeek, rerankWithDeepSeek } from "@/lib/deepseek";
import { discoverGitHubResources } from "@/lib/github-discovery-core";
import { analyzeProject, buildAnalyzerPrompt } from "@/lib/project-analyzer";
import type { AnalyzerResult } from "@/lib/project-analyzer";
import { rebuildCodexPrompt } from "@/lib/recommendation";
import type { Resource } from "@/lib/types";

export async function analyzeProjectWithAI(input: string, resources: Resource[]): Promise<AnalyzerResult & { source: "deepseek" | "rules"; discoveredCount: number }> {
  const initial = analyzeProject(input, resources);
  let ai: Awaited<ReturnType<typeof analyzeWithDeepSeek>> = null;
  try {
    ai = await analyzeWithDeepSeek(input);
  } catch (error) {
    console.warn("DeepSeek analysis failed, using rules tags.", error);
  }

  let discovered: Resource[] = [];
  try {
    discovered = await discoverGitHubResources(input, ai?.tags?.length ? ai.tags : initial.analysis.tags, []);
    console.warn(`GitHub discovery runtime: token=${Boolean(process.env.GITHUB_TOKEN)} candidates=${discovered.length}`);
  } catch (error) {
    console.warn("GitHub discovery failed, keeping database resources.", error);
  }

  const candidateResources = mergeResources(resources, discovered);
  const fallback = analyzeProject(input, candidateResources);

  try {
    if (!ai) return { ...fallback, source: "rules", discoveredCount: discovered.length };
    const enriched = analyzeProject(`${input} ${(ai.tags ?? []).join(" ")}`, candidateResources, {
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
    });
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
  const candidates = recommendation.groups.flatMap((group) => group.items).map((item) => ({
    id: item.resource.id,
    name: item.resource.name,
    type: item.resource.type,
    description: item.resource.description,
    tags: item.resource.tags,
    trust: item.resource.trust_score,
    fit: item.resource.fit_score,
    risk: item.resource.risk_level
  }));
  if (candidates.length === 0) return recommendation;

  try {
    const scores = await rerankWithDeepSeek(input, candidates);
    const scoreMap = new Map(scores.map((item) => [item.id, item]));
    return {
      ...recommendation,
      groups: recommendation.groups.map((group) => {
        const items = [...group.items].map((item) => {
          const rerank = scoreMap.get(item.resource.id);
          return rerank ? { ...item, score: rerank.score, why: rerank.reason } : item;
        }).filter((item) => item.score >= 35).sort((a, b) => b.score - a.score);
        return {
          ...group,
          items,
          gap: items.length > 0 ? group.gap : group.gap ?? `当前需求暂无${group.title}的强匹配资源。`
        };
      }),
      gaps: Array.from(new Set([
        ...recommendation.gaps,
        ...recommendation.groups.filter((group) => group.items.length === 0).map((group) => group.gap).filter(Boolean) as string[]
      ]))
    };
  } catch (error) {
    console.warn("DeepSeek rerank failed, keeping rule scores.", error);
    return recommendation;
  }
}
