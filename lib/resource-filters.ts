import type { Resource, ResourceFilters } from "@/lib/types";

export type ResourceSort = "relevance" | "trust" | "latest" | "stars";

export function getResourceTags(resources: Resource[]) {
  return Array.from(new Set(resources.flatMap((resource) => resource.tags))).sort((a, b) => a.localeCompare(b));
}

export function getPopularResourceTags(resources: Resource[], limit = 100) {
  const counts = new Map<string, number>();
  resources.forEach((resource) => {
    resource.tags.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1));
  });

  return Array.from(counts)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, Math.max(0, limit))
    .map(([tag]) => tag);
}

export function filterResources(resources: Resource[], filters: ResourceFilters) {
  const searchQuery = expandSearchQuery(filters.query);

  return resources
    .map((resource) => ({
      resource,
      searchScore: getSearchScore(resource, searchQuery)
    }))
    .filter(({ resource, searchScore }) => {
    const matchesQuery = searchQuery.primary.length === 0 || searchScore >= 30;
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

export function sortResources(resources: Resource[], sort: ResourceSort) {
  if (sort === "relevance") return resources;

  return [...resources].sort((left, right) => {
    if (sort === "trust") {
      return right.trust_score - left.trust_score || right.fit_score - left.fit_score;
    }
    if (sort === "stars") {
      return (right.github_stars ?? 0) - (left.github_stars ?? 0) ||
        right.trust_score - left.trust_score;
    }

    return getTimestamp(right.last_updated) - getTimestamp(left.last_updated) ||
      right.trust_score - left.trust_score;
  });
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
    ["finance", "financial", "fintech", "investment", "banking", "insurance", "trading", "stock", "market-data", "akshare", "qlib", "rqalpha", "金融", "财经", "投资"]
  ],
  [
    ["做饭", "菜谱", "食材", "烹饪", "忌口", "餐食", "菜单"],
    ["recipe", "recipes", "cooking", "ingredient", "meal", "meal-planning", "nutrition", "dietary-restrictions", "howtocook", "mealie", "tandoor"]
  ],
  [
    ["2d转3d", "2d 转 3d", "二维转三维", "图像转三维", "三维模型"],
    ["image-to-3d", "2d-to-3d", "depth-estimation", "mesh-generation", "threejs", "webgl", "img2threejs", "model-viewer"]
  ],
  [
    ["超市", "库存", "货物", "商品", "仓库", "库位"],
    ["inventory", "inventory-management", "stock-control", "warehouse", "warehouse-location", "item-pricing", "erp", "inventree", "erpnext"]
  ],
  [
    ["语音", "语音聊天", "语音识别", "语音输入", "听写"],
    ["speech-to-text", "speech-recognition", "asr", "chinese-asr", "streaming-asr", "funasr", "faster-whisper", "whisper"]
  ],
  [
    ["宠物", "宠物医院", "兽医", "疫苗", "病历"],
    ["veterinary", "pet-clinic", "medical-records", "vaccination", "appointment", "doctor-scheduling", "openvpms"]
  ],
  [
    ["预测性维护", "设备维护", "故障预测", "传感器", "异常检测"],
    ["predictive-maintenance", "condition-monitoring", "anomaly-detection", "time-series", "sensor-data", "pyod", "fault-detection"]
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

  const expandedMetadataScore = query.expanded.reduce((score, term) => {
    if (!term) return score;
    return score +
      (name.includes(term) ? 34 : 0) +
      (tags.includes(term) ? 30 : tags.some((tag) => tag.includes(term)) ? 22 : 0) +
      (useCases.some((useCase) => useCase.includes(term)) ? 16 : 0);
  }, 0);
  const expandedDescriptionScore = Math.min(
    18,
    query.expanded.reduce(
      (score, term) => score + getDescriptionScore(description.indexOf(term), 18, 10, 3),
      0
    )
  );

  return primaryScore + expandedMetadataScore + expandedDescriptionScore;
}

function getDescriptionScore(index: number, earlyScore: number, middleScore: number, lateScore: number) {
  if (index < 0) return 0;
  if (index < 240) return earlyScore;
  if (index < 800) return middleScore;
  return lateScore;
}

function getTimestamp(value: string) {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}
