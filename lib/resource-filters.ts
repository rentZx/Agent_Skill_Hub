import type { Resource, ResourceFilters } from "@/lib/types";

export function getResourceTags(resources: Resource[]) {
  return Array.from(new Set(resources.flatMap((resource) => resource.tags))).sort((a, b) => a.localeCompare(b));
}

export function filterResources(resources: Resource[], filters: ResourceFilters) {
  const queryTerms = expandSearchQuery(filters.query);

  return resources.filter((resource) => {
    const haystack = [
      resource.name,
      resource.description,
      resource.type,
      resource.install_command,
      resource.source,
      ...resource.tags,
      ...resource.supported_agents,
      ...resource.use_cases
    ]
      .join(" ")
      .toLowerCase();

    const matchesQuery = queryTerms.length === 0 || queryTerms.some((term) => haystack.includes(term));

    const matchesType = !filters.type || filters.type === "all" || resource.type === filters.type;
    const matchesTag = !filters.tag || filters.tag === "all" || resource.tags.includes(filters.tag);
    const matchesRisk = !filters.risk || filters.risk === "all" || resource.risk_level === filters.risk;

    return matchesQuery && matchesType && matchesTag && matchesRisk;
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
  ]
];

function expandSearchQuery(input?: string) {
  const raw = input?.trim().toLowerCase();

  if (!raw) {
    return [];
  }

  const terms = new Set([raw]);
  const splitTerms = raw.match(/[a-z0-9][a-z0-9/-]{1,}|[\u4e00-\u9fa5]{2,}/g) ?? [];
  splitTerms.forEach((term) => terms.add(term));

  for (const [triggers, expansions] of searchSynonyms) {
    if (triggers.some((trigger) => raw.includes(trigger.toLowerCase()))) {
      expansions.forEach((term) => terms.add(term.toLowerCase()));
    }
  }

  return Array.from(terms);
}
