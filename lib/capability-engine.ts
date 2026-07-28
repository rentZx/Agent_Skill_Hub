import type { ResourceType } from "@/lib/types";

export type CapabilityPriority = "core" | "required" | "optional";

export type ResourceRole =
  | "domain_system"
  | "domain_data"
  | "domain_algorithm"
  | "speech_to_text"
  | "text_to_speech"
  | "agent_tool"
  | "mcp_integration"
  | "ui_library"
  | "project_template"
  | "developer_tool";

export type CapabilityRequirement = {
  id: string;
  label: string;
  description: string;
  required: boolean;
  priority: CapabilityPriority;
  resourceRoles: ResourceRole[];
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

const capabilityPriorities: CapabilityPriority[] = ["core", "required", "optional"];
const resourceRoles: ResourceRole[] = [
  "domain_system",
  "domain_data",
  "domain_algorithm",
  "speech_to_text",
  "text_to_speech",
  "agent_tool",
  "mcp_integration",
  "ui_library",
  "project_template",
  "developer_tool"
];

const resourceTypes: ResourceType[] = [
  "agent_skill",
  "mcp_server",
  "github_plugin",
  "ui_component",
  "template_repo"
];

const genericCapabilityKeywords = new Set([
  "ai", "agent", "agents", "app", "application", "web", "platform", "software", "system", "tool", "tools",
  "github", "skill", "skills", "plugin", "plugins", "api", "database", "frontend", "backend", "service",
  "management", "user", "users", "project"
]);

const capabilityPatterns: Array<{
  id: string;
  label: string;
  description: string;
  terms: string[];
  keywords: string[];
  negativeKeywords?: string[];
  preferredTypes: ResourceType[];
  priority: CapabilityPriority;
  resourceRoles: ResourceRole[];
}> = [
  {
    id: "inventory-management",
    label: "商品库存与库位管理",
    description: "管理商品档案、价格、库存数量、仓库或货架位置，并支持实时查询。",
    terms: ["超市", "货物", "商品价格", "库存", "库位", "货架", "仓库", "inventory", "warehouse", "stock control"],
    keywords: ["inventory management", "stock control", "warehouse location", "product catalog", "item pricing"],
    negativeKeywords: ["ecommerce storefront only", "shelf image generation", "virtual shelf"],
    preferredTypes: ["template_repo", "github_plugin", "mcp_server"],
    priority: "core",
    resourceRoles: ["domain_system", "domain_data"]
  },
  {
    id: "speech-to-text",
    label: "语音识别与文字转写",
    description: "把用户语音稳定转写为可执行查询，支持中文、流式输入和错误恢复。",
    terms: ["语音聊天", "语音查询", "语音输入", "语音对话", "speech-to-text", "speech recognition", "asr"],
    keywords: ["speech-to-text", "automatic speech recognition", "chinese asr", "streaming asr", "voice transcription"],
    negativeKeywords: ["ai companion", "virtual character", "voice changer", "vtuber"],
    preferredTypes: ["github_plugin", "template_repo", "mcp_server", "agent_skill"],
    priority: "required",
    resourceRoles: ["speech_to_text"]
  },
  {
    id: "conversational-query",
    label: "自然语言业务查询",
    description: "把自然语言问题转换为受约束的业务查询，并只返回有数据依据的结果。",
    terms: ["聊天的方式", "告诉我", "问答", "自然语言查询", "对话查询", "tool calling", "function calling"],
    keywords: ["natural language query", "tool calling", "function calling", "structured query", "database question answering"],
    negativeKeywords: ["ai companion", "roleplay", "virtual character"],
    preferredTypes: ["agent_skill", "mcp_server", "github_plugin", "template_repo"],
    priority: "required",
    resourceRoles: ["agent_tool", "mcp_integration"]
  },
  {
    id: "domain-data",
    label: "领域数据与数据源",
    description: "获取、整理和查询项目核心业务数据，并保留数据来源与更新方式。",
    terms: ["数据源", "行情", "菜谱", "食谱", "文档", "知识库", "catalog", "dataset", "market data", "recipe"],
    keywords: ["dataset", "data source", "api", "catalog", "database"],
    preferredTypes: ["mcp_server", "template_repo", "agent_skill"],
    priority: "required",
    resourceRoles: ["domain_data"]
  },
  {
    id: "real-time-integration",
    label: "实时数据与外部接口",
    description: "接入实时或高频更新的数据接口，并处理同步、缓存和异常。",
    terms: ["实时", "分钟级", "推送", "websocket", "real-time", "live data", "streaming"],
    keywords: ["real-time", "websocket", "streaming", "live data", "api client"],
    negativeKeywords: ["mock data only", "static dataset"],
    preferredTypes: ["mcp_server", "template_repo", "github_plugin"],
    priority: "required",
    resourceRoles: ["domain_data", "mcp_integration"]
  },
  {
    id: "personalized-recommendation",
    label: "个性化筛选与推荐",
    description: "根据用户条件、偏好和限制生成可解释的筛选与推荐结果。",
    terms: ["推荐", "匹配", "偏好", "忌口", "年龄", "recommendation", "personalized", "ranking"],
    keywords: ["recommendation", "recommender system", "personalization", "ranking", "filtering"],
    preferredTypes: ["agent_skill", "template_repo", "mcp_server"],
    priority: "core",
    resourceRoles: ["domain_algorithm"]
  },
  {
    id: "visualization",
    label: "专业可视化与交互",
    description: "使用适合当前领域的图表、画布或交互组件展示核心结果。",
    terms: ["图表", "k线", "分时图", "可视化", "3d", "预览", "chart", "visualization", "viewer"],
    keywords: ["visualization", "charting library", "dashboard", "viewer", "interactive"],
    preferredTypes: ["ui_component", "template_repo"],
    priority: "required",
    resourceRoles: ["ui_library", "domain_algorithm"]
  },
  {
    id: "workflow-automation",
    label: "业务流程与自动化",
    description: "把多步骤业务操作组织成可重复、可追踪和可验证的工作流。",
    terms: ["流程", "步骤", "自动化", "编排", "workflow", "automation", "pipeline"],
    keywords: ["workflow", "automation", "pipeline", "orchestration"],
    preferredTypes: ["agent_skill", "mcp_server", "github_plugin", "template_repo"],
    priority: "required",
    resourceRoles: ["agent_tool", "mcp_integration"]
  },
  {
    id: "document-processing",
    label: "文档与结构化抽取",
    description: "读取文档、网页或表格，并抽取项目需要的结构化字段。",
    terms: ["pdf", "word", "excel", "文档", "表格", "解析", "抽取", "ocr"],
    keywords: ["document parsing", "pdf", "ocr", "data extraction", "spreadsheet"],
    preferredTypes: ["agent_skill", "mcp_server", "template_repo"],
    priority: "required",
    resourceRoles: ["domain_data", "agent_tool"]
  },
  {
    id: "web-research",
    label: "联网检索与网页采集",
    description: "搜索、访问和采集公开网页内容，并保存可追溯来源。",
    terms: ["联网搜索", "网页搜索", "网页采集", "网页抓取", "网络爬虫", "爬虫", "采集网页", "抓取网页", "crawl", "scrape", "web research"],
    keywords: ["web search", "web scraping", "crawler", "research", "browser automation"],
    preferredTypes: ["agent_skill", "mcp_server", "template_repo"],
    priority: "required",
    resourceRoles: ["domain_data", "agent_tool"]
  },
  {
    id: "domain-rules",
    label: "领域规则与约束",
    description: "执行项目中的硬性业务规则、排除条件和边界校验。",
    terms: ["规则", "约束", "风险", "合规", "过敏", "权限", "validation", "compliance"],
    keywords: ["rules engine", "validation", "constraints", "policy", "compliance"],
    preferredTypes: ["agent_skill", "template_repo"],
    priority: "required",
    resourceRoles: ["domain_algorithm", "agent_tool"]
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
      required: pattern.priority !== "optional",
      negativeKeywords: pattern.negativeKeywords ?? []
    }));

  const featureCapabilities = (details.coreFeatures ?? [])
    .map((feature, index) => capabilityFromFeature(feature, index))
    .filter((capability) => ![...seeded, ...patterned].some((existing) => capabilitiesOverlap(existing, capability)));

  const capabilities = removeCompositeCapabilities(
    dedupeCapabilities([...seeded, ...patterned, ...featureCapabilities])
  ).slice(0, 10);
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
  const keywords = cleanStrings(seed.keywords ?? [], 12).filter(isSpecificCapabilityKeyword);
  if (!label || keywords.length === 0) return null;

  const preferredTypes = (seed.preferredTypes ?? [])
    .filter((type): type is ResourceType => resourceTypes.includes(type as ResourceType));
  let priority = capabilityPriorities.includes(seed.priority as CapabilityPriority)
    ? seed.priority as CapabilityPriority
    : seed.required === false
      ? "optional"
      : "required";
  const seededRoles = (seed.resourceRoles ?? [])
    .filter((role): role is ResourceRole => resourceRoles.includes(role as ResourceRole));
  const inferredRoles = seededRoles.length > 0 ? seededRoles : inferResourceRoles(label, keywords, preferredTypes);
  const hasDomainRole = inferredRoles.some((role) =>
    role === "domain_system" || role === "domain_data" || role === "domain_algorithm"
  );
  if (priority === "core" && !hasDomainRole) priority = "required";
  if (inferredRoles.includes("text_to_speech")) priority = "optional";

  return {
    id: slugify(seed.id || label),
    label,
    description: seed.description?.trim() || `实现${label}并验证其能力边界。`,
    required: priority !== "optional",
    priority,
    resourceRoles: inferredRoles,
    keywords,
    negativeKeywords: cleanStrings(seed.negativeKeywords ?? [], 8),
    preferredTypes: preferredTypes.length > 0 ? preferredTypes : ["agent_skill", "mcp_server", "template_repo"]
  };
}

function capabilityFromFeature(feature: string, index: number): CapabilityRequirement {
  const keywords = extractFeatureKeywords(feature);
  const preferredTypes: ResourceType[] = ["agent_skill", "mcp_server", "template_repo", "ui_component"];
  const priority: CapabilityPriority = index === 0 ? "core" : "required";
  return {
    id: slugify(keywords.find((keyword) => /[a-z]/i.test(keyword)) || feature || `feature-${index + 1}`),
    label: feature.trim(),
    description: `实现“${feature.trim()}”，并提供可验证的输入、输出和异常处理。`,
    required: true,
    priority,
    resourceRoles: inferResourceRoles(feature, keywords, preferredTypes),
    keywords,
    negativeKeywords: [],
    preferredTypes
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
  const generated = [...capabilities]
    .sort((left, right) => priorityWeight(right.priority) - priorityWeight(left.priority))
    .flatMap((capability) => {
    const englishKeywords = capability.keywords.filter((keyword) => /[a-z]/i.test(keyword));
    if (englishKeywords.length === 0) return [];
    const roleHint = capability.resourceRoles.includes("domain_system")
      ? "open source"
      : capability.resourceRoles.includes("speech_to_text")
        ? "github"
        : "";
    return [[...englishKeywords.slice(0, 3).map(quoteTerm), roleHint].filter(Boolean).join(" ")];
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

function isSpecificCapabilityKeyword(keyword: string) {
  const normalized = keyword.toLowerCase().trim();
  return normalized.length >= 3 && !genericCapabilityKeywords.has(normalized);
}

function quoteTerm(term: string) {
  return /\s/.test(term) ? `"${term}"` : term;
}

function inferResourceRoles(label: string, keywords: string[], preferredTypes: ResourceType[]): ResourceRole[] {
  const source = `${label} ${keywords.join(" ")}`.toLowerCase();
  const inferred: ResourceRole[] = [];

  if (/(speech-to-text|speech recognition|语音识别|语音转写|\basr\b)/.test(source)) inferred.push("speech_to_text");
  if (/(text-to-speech|语音合成|\btts\b)/.test(source)) inferred.push("text_to_speech");
  if (/(dataset|data source|catalog|数据源|数据集)/.test(source)) inferred.push("domain_data");
  if (/(recommend|ranking|algorithm|analysis|规则|分析|推荐)/.test(source)) inferred.push("domain_algorithm");
  if (/(inventory|warehouse|crm|erp|management|管理|库存|仓库)/.test(source)) inferred.push("domain_system");
  if (/(tool calling|function calling|workflow|automation|查询|问答)/.test(source)) inferred.push("agent_tool");
  if (preferredTypes.includes("mcp_server")) inferred.push("mcp_integration");
  if (preferredTypes.includes("ui_component")) inferred.push("ui_library");
  if (preferredTypes.includes("template_repo")) inferred.push("project_template");

  return Array.from(new Set(inferred.length > 0 ? inferred : ["developer_tool"]));
}

function priorityWeight(priority: CapabilityPriority) {
  return priority === "core" ? 3 : priority === "required" ? 2 : 1;
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

function removeCompositeCapabilities(capabilities: CapabilityRequirement[]) {
  const hasSpeechCapability = capabilities.some((capability) =>
    capability.id === "speech-to-text" || capability.resourceRoles.includes("speech_to_text")
  );
  const hasDomainSystem = capabilities.some((capability) =>
    capability.id === "inventory-management" || capability.resourceRoles.includes("domain_system")
  );
  if (!hasSpeechCapability || !hasDomainSystem) return capabilities;

  return capabilities.filter((capability) => {
    if (["speech-to-text", "conversational-query", "inventory-management"].includes(capability.id)) return true;
    const source = `${capability.label} ${capability.keywords.join(" ")}`.toLowerCase();
    const combinesVoiceAndBusinessQuery =
      /(语音|voice|speech)/.test(source)
      && /(查询|价格|库存|位置|query|lookup|price|inventory|location)/.test(source);
    return !combinesVoiceAndBusinessQuery;
  });
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
