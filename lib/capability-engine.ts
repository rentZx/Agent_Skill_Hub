import type { ResourceType } from "@/lib/types";

export type CapabilityRequirement = {
  id: string;
  label: string;
  description: string;
  required: boolean;
  keywords: string[];
  negativeKeywords: string[];
  preferredTypes: ResourceType[];
};

export type CapabilityGraph = {
  domain: string;
  capabilities: CapabilityRequirement[];
  constraints: string[];
  searchQueries: string[];
};

export type CapabilitySeed = Partial<Omit<CapabilityRequirement, "preferredTypes">> & {
  preferredTypes?: string[];
};

type CapabilityGraphInput = {
  projectType?: string;
  coreFeatures?: string[];
  tags?: string[];
  capabilities?: CapabilitySeed[];
  constraints?: string[];
  searchQueries?: string[];
};

const resourceTypes: ResourceType[] = [
  "agent_skill",
  "mcp_server",
  "github_plugin",
  "ui_component",
  "template_repo"
];

const capabilityPatterns: Array<{
  id: string;
  label: string;
  description: string;
  terms: string[];
  keywords: string[];
  negativeKeywords?: string[];
  preferredTypes: ResourceType[];
}> = [
  {
    id: "domain-data",
    label: "领域数据与数据源",
    description: "获取、整理和查询项目核心业务数据，并保留数据来源与更新方式。",
    terms: ["数据源", "行情", "菜谱", "食谱", "文档", "知识库", "catalog", "dataset", "market data", "recipe"],
    keywords: ["dataset", "data source", "api", "catalog", "database"],
    preferredTypes: ["mcp_server", "template_repo", "agent_skill"]
  },
  {
    id: "real-time-integration",
    label: "实时数据与外部接口",
    description: "接入实时或高频更新的数据接口，并处理同步、缓存和异常。",
    terms: ["实时", "分钟级", "推送", "websocket", "real-time", "live data", "streaming"],
    keywords: ["real-time", "websocket", "streaming", "live data", "api client"],
    negativeKeywords: ["mock data only", "static dataset"],
    preferredTypes: ["mcp_server", "template_repo", "github_plugin"]
  },
  {
    id: "personalized-recommendation",
    label: "个性化筛选与推荐",
    description: "根据用户条件、偏好和限制生成可解释的筛选与推荐结果。",
    terms: ["推荐", "匹配", "偏好", "忌口", "年龄", "recommendation", "personalized", "ranking"],
    keywords: ["recommendation", "recommender system", "personalization", "ranking", "filtering"],
    preferredTypes: ["agent_skill", "template_repo", "mcp_server"]
  },
  {
    id: "visualization",
    label: "专业可视化与交互",
    description: "使用适合当前领域的图表、画布或交互组件展示核心结果。",
    terms: ["图表", "k线", "分时图", "可视化", "3d", "预览", "chart", "visualization", "viewer"],
    keywords: ["visualization", "charting library", "dashboard", "viewer", "interactive"],
    preferredTypes: ["ui_component", "template_repo"]
  },
  {
    id: "workflow-automation",
    label: "业务流程与自动化",
    description: "把多步骤业务操作组织成可重复、可追踪和可验证的工作流。",
    terms: ["流程", "步骤", "自动化", "编排", "workflow", "automation", "pipeline"],
    keywords: ["workflow", "automation", "pipeline", "orchestration"],
    preferredTypes: ["agent_skill", "mcp_server", "github_plugin", "template_repo"]
  },
  {
    id: "document-processing",
    label: "文档与结构化抽取",
    description: "读取文档、网页或表格，并抽取项目需要的结构化字段。",
    terms: ["pdf", "word", "excel", "文档", "表格", "解析", "抽取", "ocr"],
    keywords: ["document parsing", "pdf", "ocr", "data extraction", "spreadsheet"],
    preferredTypes: ["agent_skill", "mcp_server", "template_repo"]
  },
  {
    id: "web-research",
    label: "联网检索与网页采集",
    description: "搜索、访问和采集公开网页内容，并保存可追溯来源。",
    terms: ["联网搜索", "网页搜索", "网页采集", "网页抓取", "网络爬虫", "爬虫", "采集网页", "抓取网页", "crawl", "scrape", "web research"],
    keywords: ["web search", "web scraping", "crawler", "research", "browser automation"],
    preferredTypes: ["agent_skill", "mcp_server", "template_repo"]
  },
  {
    id: "domain-rules",
    label: "领域规则与约束",
    description: "执行项目中的硬性业务规则、排除条件和边界校验。",
    terms: ["规则", "约束", "风险", "合规", "过敏", "权限", "validation", "compliance"],
    keywords: ["rules engine", "validation", "constraints", "policy", "compliance"],
    preferredTypes: ["agent_skill", "template_repo"]
  }
];

export function buildCapabilityGraph(input: string, details: CapabilityGraphInput = {}): CapabilityGraph {
  const source = [
    input,
    details.projectType ?? "",
    ...(details.coreFeatures ?? []),
    ...(details.tags ?? [])
  ].join(" ").toLowerCase();

  const seeded = (details.capabilities ?? [])
    .map(normalizeCapabilitySeed)
    .filter((capability): capability is CapabilityRequirement => Boolean(capability));

  const patterned = capabilityPatterns
    .filter((pattern) => pattern.terms.some((term) => source.includes(term.toLowerCase())))
    .map((pattern) => ({
      ...pattern,
      required: true,
      negativeKeywords: pattern.negativeKeywords ?? []
    }));

  const featureCapabilities = (details.coreFeatures ?? [])
    .map((feature, index) => capabilityFromFeature(feature, index))
    .filter((capability) => ![...seeded, ...patterned].some((existing) => capabilitiesOverlap(existing, capability)));

  const capabilities = dedupeCapabilities([...seeded, ...patterned, ...featureCapabilities]).slice(0, 10);
  const searchQueries = buildSearchQueries(capabilities, details.searchQueries ?? []);

  return {
    domain: details.projectType?.trim() || inferDomain(input),
    capabilities,
    constraints: cleanStrings(details.constraints ?? [], 10),
    searchQueries
  };
}

function normalizeCapabilitySeed(seed: CapabilitySeed): CapabilityRequirement | null {
  const label = seed.label?.trim();
  const keywords = cleanStrings(seed.keywords ?? [], 12);
  if (!label || keywords.length === 0) return null;

  const preferredTypes = (seed.preferredTypes ?? [])
    .filter((type): type is ResourceType => resourceTypes.includes(type as ResourceType));

  return {
    id: slugify(seed.id || label),
    label,
    description: seed.description?.trim() || `实现${label}并验证其能力边界。`,
    required: seed.required !== false,
    keywords,
    negativeKeywords: cleanStrings(seed.negativeKeywords ?? [], 8),
    preferredTypes: preferredTypes.length > 0 ? preferredTypes : ["agent_skill", "mcp_server", "template_repo"]
  };
}

function capabilityFromFeature(feature: string, index: number): CapabilityRequirement {
  const keywords = extractFeatureKeywords(feature);
  return {
    id: slugify(keywords.find((keyword) => /[a-z]/i.test(keyword)) || feature || `feature-${index + 1}`),
    label: feature.trim(),
    description: `实现“${feature.trim()}”，并提供可验证的输入、输出和异常处理。`,
    required: true,
    keywords,
    negativeKeywords: [],
    preferredTypes: ["agent_skill", "mcp_server", "template_repo", "ui_component"]
  };
}

function extractFeatureKeywords(feature: string) {
  const english = feature.toLowerCase().match(/[a-z][a-z0-9-]{1,}/g) ?? [];
  const chineseTerms = feature
    .split(/[、，,；;：:\s]+/)
    .map((term) => term.replace(/^(根据|支持|实现|提供|展示|进行|可以|能够)/, "").trim())
    .filter((term) => term.length >= 2 && term.length <= 12);
  return cleanStrings([feature.trim(), ...english, ...chineseTerms], 8);
}

function buildSearchQueries(capabilities: CapabilityRequirement[], suggested: string[]) {
  const safeSuggested = suggested
    .map(sanitizeSearchQuery)
    .filter(Boolean);
  const generated = capabilities.flatMap((capability) => {
    const englishKeywords = capability.keywords.filter((keyword) => /[a-z]/i.test(keyword));
    if (englishKeywords.length === 0) return [];
    return [englishKeywords.slice(0, 3).map(quoteTerm).join(" ")];
  });

  return cleanStrings([...safeSuggested, ...generated], 8);
}

function sanitizeSearchQuery(query: string) {
  return query
    .replace(/\b(in:|sort:|archived:|fork:|stars:|language:)\S*/gi, " ")
    .replace(/[^\w\u4e00-\u9fff" .+-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function quoteTerm(term: string) {
  return /\s/.test(term) ? `"${term}"` : term;
}

function capabilitiesOverlap(left: CapabilityRequirement, right: CapabilityRequirement) {
  if (normalizeTerm(left.label) === normalizeTerm(right.label)) return true;
  const leftTerms = new Set(left.keywords.map(normalizeTerm));
  return right.keywords.some((keyword) => leftTerms.has(normalizeTerm(keyword)));
}

function dedupeCapabilities(capabilities: CapabilityRequirement[]) {
  const unique = new Map<string, CapabilityRequirement>();
  capabilities.forEach((capability) => {
    const key = capability.id || slugify(capability.label);
    if (!unique.has(key)) unique.set(key, capability);
  });
  return Array.from(unique.values());
}

function cleanStrings(values: string[], limit: number) {
  return Array.from(new Set(values.map((value) => value.trim()).filter((value) => value.length > 1))).slice(0, limit);
}

function normalizeTerm(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, "");
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "project-capability";
}

function inferDomain(input: string) {
  const normalized = input.trim();
  return normalized.length > 36 ? `${normalized.slice(0, 36)}...` : normalized || "通用软件项目";
}
