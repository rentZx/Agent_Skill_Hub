import type { Resource, ResourceType } from "@/lib/types";
import { isResourceRecommendationEligible } from "@/lib/resource-verification";

export function rankFeaturedResources(resources: Resource[]) {
  return resources
    .filter((resource) => resource.risk_level !== "high")
    .filter(isResourceRecommendationEligible)
    .map((resource) => ({ resource, score: featuredScore(resource) }))
    .sort((a, b) => b.score - a.score || b.resource.fit_score - a.resource.fit_score)
    .map(({ resource }) => resource);
}

export function selectDailyFeaturedSkills(
  resources: Resource[],
  date = new Date(),
  limit = 6
) {
  if (limit <= 0) return [];

  const allRankedSkills = rankFeaturedResources(
    resources.filter((resource) => resource.type === "agent_skill")
  );
  const rankedSkills = allRankedSkills;
  const highQualitySkills = rankedSkills.filter(
    (resource) => resource.trust_score >= 70 && resource.fit_score >= 60
  );
  const eligibleSkills = highQualitySkills.length >= limit ? highQualitySkills : rankedSkills;
  const candidatePool = eligibleSkills.slice(0, Math.max(limit, Math.min(30, eligibleSkills.length)));
  const rankById = new Map(candidatePool.map((resource, index) => [resource.id, index]));
  const selected = seededShuffle(candidatePool, getChinaDayKey(date)).slice(0, limit);

  return selected.sort(
    (a, b) => (rankById.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (rankById.get(b.id) ?? Number.MAX_SAFE_INTEGER)
  );
}

export function getCoverageScore(resources: Resource[], type: ResourceType) {
  const typedResources = resources.filter(
    (resource) => resource.type === type && isResourceRecommendationEligible(resource)
  );
  if (typedResources.length === 0) return 0;

  const averageFit = average(typedResources.map((resource) => resource.fit_score));
  const averageTrust = average(typedResources.map((resource) => resource.trust_score));
  const lowRiskRatio = typedResources.filter((resource) => resource.risk_level === "low").length / typedResources.length;
  const volumeBonus = Math.min(12, Math.round(Math.log2(typedResources.length + 1) * 3));

  return Math.min(100, Math.round(averageFit * 0.52 + averageTrust * 0.28 + lowRiskRatio * 18 + volumeBonus));
}

export function formatResourceDate(value?: string) {
  if (!value) return "未记录";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function featuredScore(resource: Resource) {
  const freshness = getFreshnessScore(resource.last_updated);
  const popularity = getPopularityScore(resource.github_stars ?? 0);
  const riskPenalty = resource.risk_level === "medium" ? 5 : 0;

  return resource.fit_score * 0.45 + resource.trust_score * 0.3 + freshness * 0.15 + popularity * 0.1 - riskPenalty;
}

function getFreshnessScore(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return 0;

  const ageDays = Math.max(0, (Date.now() - timestamp) / 86400000);
  return Math.max(0, Math.round(100 - ageDays * 2));
}

function getPopularityScore(stars: number) {
  if (stars <= 0) return 40;
  return Math.min(100, Math.round(40 + Math.log10(stars + 1) * 20));
}

function average(values: number[]) {
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function getChinaDayKey(date: Date) {
  return new Date(date.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function seededShuffle<T>(items: T[], seedValue: string) {
  const shuffled = [...items];
  let seed = hashString(seedValue);

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const swapIndex = seed % (index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
