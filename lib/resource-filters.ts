import type { Resource, ResourceFilters } from "@/lib/types";

export function getResourceTags(resources: Resource[]) {
  return Array.from(new Set(resources.flatMap((resource) => resource.tags))).sort((a, b) => a.localeCompare(b));
}

export function filterResources(resources: Resource[], filters: ResourceFilters) {
  const searchQuery = expandSearchQuery(filters.query);

  return resources
    .map((resource) => ({
      resource,
      searchScore: getSearchScore(resource, searchQuery)
    }))
    .filter(({ resource, searchScore }) => {
    const matchesQuery = searchQuery.primary.length === 0 || searchScore >= 24;
    const matchesType = !filters.type || filters.type === "all" || resource.type === filters.type;
    const matchesTag = !filters.tag || filters.tag === "all" || resource.tags.includes(filters.tag);
    const matchesRisk = !filters.risk || filters.risk === "all" || resource.risk_level === filters.risk;

    return matchesQuery && matchesType && matchesTag && matchesRisk;
    })
    .sort((left, right) =>
      right.searchScore - left.searchScore ||
      right.resource.fit_score + right.resource.trust_score - (left.resource.fit_score + left.resource.trust_score)
    )
    .map(({ resource }) => resource);
}

const searchSynonyms: Array<[string[], string[]]> = [
  [
    ["文档", "文档解析", "解析", "pdf", "word", "表格", "文件", "markitdown"],
    ["pdf", "document", "documents", "docx", "word", "excel", "spreadsheet", "markdown", "markitdown", "解析", "文档"]
  ],
  [
    ["界面", "炫酷", "科技风", "动效", "组件", "前端", "ui"],
    ["motion", "shadcn", "aceternity", "tailwind", "component", "components", "dashboard", "animation", "科技风", "界面"]
  ],
  [
    ["爬虫", "网页抓取", "抓取", "网页采集", "采集", "浏览器", "爬取"],
    ["firecrawl", "scraper", "scraping", "browser", "crawl", "crawler", "playwright", "research", "网页", "抓取"]
  ],
  [
    ["搜索", "推荐", "语义", "向量"],
    ["search", "recommendation", "pgvector", "embedding", "embeddings", "semantic", "推荐", "搜索"]
  ],
  [
    ["数据库", "存储", "后台"],
    ["database", "postgres", "supabase", "storage", "backend", "数据库", "存储"]
  ],
  [
    ["测试", "自动化测试", "验收"],
    ["testing", "playwright", "browser", "e2e", "ci", "review", "测试"]
  ],
  [
    ["金融", "财经", "投资", "证券", "银行", "保险", "fintech"],
    ["finance", "financial", "fintech", "investment", "banking", "insurance", "trading", "金融", "财经", "投资"]
  ]
];

function expandSearchQuery(input?: string) {
  const raw = input?.trim().toLowerCase();

  if (!raw) {
    return { primary: [], expanded: [] };
  }

  const primary = new Set([raw]);
  const splitTerms = raw.match(/[a-z0-9][a-z0-9/-]{1,}|[\u4e00-\u9fa5]{2,}/g) ?? [];
  splitTerms.forEach((term) => primary.add(term));
  const expanded = new Set<string>();

  for (const [triggers, expansions] of searchSynonyms) {
    if (triggers.some((trigger) => raw.includes(trigger.toLowerCase()))) {
      expansions.forEach((term) => {
        const normalized = term.toLowerCase();
        if (!primary.has(normalized)) expanded.add(normalized);
      });
    }
  }

  return {
    primary: Array.from(primary),
    expanded: Array.from(expanded)
  };
}

function getSearchScore(
  resource: Resource,
  query: ReturnType<typeof expandSearchQuery>
) {
  if (query.primary.length === 0) return 0;

  const name = resource.name.toLowerCase();
  const description = resource.description.toLowerCase();
  const tags = resource.tags.map((tag) => tag.toLowerCase());
  const useCases = resource.use_cases.map((useCase) => useCase.toLowerCase());
  const agents = resource.supported_agents.map((agent) => agent.toLowerCase());

  const primaryScore = query.primary.reduce((score, term) => {
    if (!term) return score;
    const descriptionIndex = description.indexOf(term);
    return score +
      (name === term ? 120 : name.includes(term) ? 90 : 0) +
      (tags.includes(term) ? 70 : tags.some((tag) => tag.includes(term)) ? 52 : 0) +
      (useCases.some((useCase) => useCase.includes(term)) ? 34 : 0) +
      (agents.some((agent) => agent.includes(term)) ? 24 : 0) +
      getDescriptionScore(descriptionIndex, 46, 28, 10);
  }, 0);

  const expandedScore = query.expanded.reduce((score, term) => {
    if (!term) return score;
    const descriptionIndex = description.indexOf(term);
    return score +
      (name.includes(term) ? 34 : 0) +
      (tags.includes(term) ? 30 : tags.some((tag) => tag.includes(term)) ? 22 : 0) +
      (useCases.some((useCase) => useCase.includes(term)) ? 16 : 0) +
      getDescriptionScore(descriptionIndex, 18, 10, 3);
  }, 0);

  return primaryScore + expandedScore;
}

function getDescriptionScore(index: number, earlyScore: number, middleScore: number, lateScore: number) {
  if (index < 0) return 0;
  if (index < 240) return earlyScore;
  if (index < 800) return middleScore;
  return lateScore;
}
