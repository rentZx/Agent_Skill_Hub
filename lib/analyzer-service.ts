import "server-only";

import { analyzeWithDeepSeek, rerankWithDeepSeek } from "@/lib/deepseek";
import { analyzeProject } from "@/lib/project-analyzer";
import type { AnalyzerResult } from "@/lib/project-analyzer";
import type { Resource } from "@/lib/types";

export async function analyzeProjectWithAI(input: string, resources: Resource[]): Promise<AnalyzerResult & { source: "deepseek" | "rules" }> {
  const fallback = analyzeProject(input, resources);

  try {
    const ai = await analyzeWithDeepSeek(input);
    if (!ai) return { ...fallback, source: "rules" };
    const enriched = analyzeProject(`${input} ${(ai.tags ?? []).join(" ")}`, resources);
    const reranked = await rerankRecommendation(input, enriched.recommendation);
    return {
      ...enriched,
      source: "deepseek",
      recommendation: reranked,
      analysis: {
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
      }
    };
  } catch (error) {
    console.warn("DeepSeek analysis failed, using rules fallback.", error);
    return { ...fallback, source: "rules" };
  }
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
      groups: recommendation.groups.map((group) => ({
        ...group,
        items: [...group.items].map((item) => {
          const rerank = scoreMap.get(item.resource.id);
          return rerank ? { ...item, score: rerank.score, why: rerank.reason } : item;
        }).sort((a, b) => b.score - a.score)
      }))
    };
  } catch (error) {
    console.warn("DeepSeek rerank failed, keeping rule scores.", error);
    return recommendation;
  }
}
