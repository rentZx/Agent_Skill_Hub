import type { Resource, ResourceType, RiskLevel } from "@/lib/types";
import { typeLabels } from "@/lib/resource-types";
import { getRiskReason } from "@/lib/risk";

export type ProjectUnderstanding = {
  projectType: string;
  targetUsers: string;
  coreFeatures: string[];
  dataSources: string[];
  techStack: string[];
};

export type CapabilityModule = {
  id: string;
  label: string;
  description: string;
  keywords: string[];
  preferredTags: string[];
  preferredTypes: ResourceType[];
  projectStage: string;
};

export type RecommendedResource = {
  resource: Resource;
  why: string;
  stage: string;
  install: string;
  risk: RiskLevel;
  alternative: string;
  score: number;
  matchKind: "domain" | "baseline" | "risk";
};

export type RecommendationGroup = {
  id: string;
  title: string;
  description: string;
  items: RecommendedResource[];
  gap?: string;
};

export type ProjectRecommendation = {
  understanding: ProjectUnderstanding;
  keywords: string[];
  modules: CapabilityModule[];
  groups: RecommendationGroup[];
  gaps: string[];
  codexPrompt: string;
};

export type RecommendationContext = {
  projectType?: string;
  targetUsers?: string;
  coreFeatures?: string[];
  techStack?: string[];
};

const capabilityModules: CapabilityModule[] = [
  {
    id: "recipe-catalog",
    label: "菜谱与食材数据",
    description: "建立菜谱、食材、份量和制作步骤的数据模型，保证每道菜能被检索、展示和复用。",
    keywords: ["菜谱", "食谱", "饭菜", "料理", "食材", "recipe", "recipes", "food", "meal", "ingredients", "cooking"],
    preferredTags: ["recipe", "recipes", "food", "ingredients", "meal", "database"],
    preferredTypes: ["template_repo", "mcp_server"],
    projectStage: "菜谱数据模型、食材关系、份量字段、步骤内容管理"
  },
  {
    id: "meal-recommendation",
    label: "按人数与偏好的菜品推荐",
    description: "根据用餐人数、随机入口和筛选条件返回可解释的菜品结果，并保留推荐依据。",
    keywords: ["随机", "人数", "吃什么", "饭菜", "recommendation", "random", "servings", "meal planning", "what to cook"],
    preferredTags: ["recipe", "meal-planning", "recommendation", "random-meal", "servings"],
    preferredTypes: ["template_repo", "ui_component", "mcp_server"],
    projectStage: "人数参数、随机推荐、筛选排序、推荐结果页"
  },
  {
    id: "recipe-interaction",
    label: "备菜清单与烹饪步骤交互",
    description: "把食材清单和制作步骤做成可读、可勾选、可展开的交互流程，兼顾移动端烹饪场景。",
    keywords: ["备菜", "制作", "步骤", "烹饪", "食材", "ingredients", "cooking", "steps", "ingredient-list", "step-by-step"],
    preferredTags: ["ingredients", "cooking", "cooking-steps", "ingredient-list", "step-by-step", "ui"],
    preferredTypes: ["ui_component", "template_repo"],
    projectStage: "备菜清单、步骤展开、完成状态、移动端阅读"
  },
  {
    id: "data-collection",
    label: "数据采集",
    description: "从网站、仓库、表格或外部系统获取项目所需的原始数据，并保留可追溯来源。",
    keywords: ["采集", "爬取", "抓取", "官网", "数据源", "公司", "客户", "线索", "research", "crawl", "scrape", "lead", "company"],
    preferredTags: ["firecrawl", "scraping", "research", "browser", "github"],
    preferredTypes: ["mcp_server", "agent_skill"],
    projectStage: "数据源确认、网页采集、证据留存、线索补全"
  },
  {
    id: "document-parsing",
    label: "文档解析",
    description: "解析 PDF、Word、Excel、Markdown 或网页正文，抽取结构化字段供搜索和推荐使用。",
    keywords: ["文档", "pdf", "word", "excel", "表格", "markdown", "解析", "抽取", "上传", "report", "spreadsheet"],
    preferredTags: ["docs", "spreadsheet", "automation", "database", "template"],
    preferredTypes: ["agent_skill", "template_repo"],
    projectStage: "文件导入、内容抽取、字段标准化、报告生成"
  },
  {
    id: "search-recommendation",
    label: "搜索推荐",
    description: "把项目数据转成可检索、可排序、可解释的推荐结果，支持关键词和语义扩展。",
    keywords: ["搜索", "匹配", "排序", "筛选", "向量", "语义", "pgvector", "embedding", "recommendation", "search"],
    preferredTags: ["pgvector", "embeddings", "supabase", "database", "ai-sdk"],
    preferredTypes: ["template_repo", "mcp_server", "agent_skill"],
    projectStage: "需求归一化、检索排序、适配度解释、推荐结果生成"
  },
  {
    id: "database-storage",
    label: "数据库存储",
    description: "保存用户输入、资源库、采集结果、推荐记录、收藏和风险信号。",
    keywords: ["数据库", "保存", "存储", "后台", "用户", "收藏", "导出", "supabase", "postgres", "storage", "backend"],
    preferredTags: ["supabase", "postgres", "database", "template", "auth"],
    preferredTypes: ["mcp_server", "template_repo"],
    projectStage: "数据建模、Schema 设计、记录保存、权限和导出准备"
  },
  {
    id: "ui-components",
    label: "UI 组件",
    description: "构建输入表单、筛选器、资源卡片、组合方案、管理台和复制提示词区域。",
    keywords: ["界面", "组件", "仪表盘", "管理", "列表", "表单", "筛选", "ui", "dashboard", "component", "saas"],
    preferredTags: ["shadcn", "tailwind", "ui", "dashboard", "components", "v0"],
    preferredTypes: ["ui_component", "template_repo"],
    projectStage: "产品界面、筛选控制台、推荐卡片、管理后台"
  },
  {
    id: "automated-testing",
    label: "自动化测试",
    description: "验证页面路由、表单交互、浏览器流程、构建状态和回归风险。",
    keywords: ["测试", "验证", "浏览器", "截图", "e2e", "playwright", "ci", "build", "review"],
    preferredTags: ["playwright", "testing", "browser", "review", "actions"],
    preferredTypes: ["mcp_server", "agent_skill", "github_plugin"],
    projectStage: "本地验证、浏览器回归、PR 检查、CI 质量门禁"
  },
  {
    id: "deployment",
    label: "部署上线",
    description: "准备 Next.js 部署、环境变量、数据库迁移、GitHub 协作和交付检查。",
    keywords: ["部署", "上线", "vercel", "github", "环境变量", "ci", "发布", "deploy", "production"],
    preferredTags: ["github", "nextjs", "vercel", "supabase", "actions"],
    preferredTypes: ["github_plugin", "template_repo", "mcp_server"],
    projectStage: "仓库协作、环境配置、构建发布、上线检查"
  },
  {
    id: "agent-workflow",
    label: "Agent 开发工作流",
    description: "让 Codex 按项目上下文、官方文档、仓库约束和风险优先级执行开发。",
    keywords: ["codex", "agent", "skill", "技能", "提示词", "github", "docs", "workflow"],
    preferredTags: ["codex", "github", "docs", "skills", "openai"],
    preferredTypes: ["agent_skill", "github_plugin"],
    projectStage: "需求拆解、实现规划、代码生成、验证和交接"
  }
];

const stopWords = new Set(["我要", "开发", "一个", "可以", "根据", "以及", "用于", "系统", "the", "and", "with", "for", "to", "a", "an", "of", "in"]);

const groupDefinitions: Array<{
  id: string;
  title: string;
  description: string;
  types: ResourceType[];
  limit: number;
  requiredTags?: string[];
  riskOnly?: boolean;
}> = [
  {
    id: "required-skills",
    title: "必选 Skills",
    description: "约束 Codex 的开发方式、文档来源、浏览器验证和工程纪律。",
    types: ["agent_skill"],
    limit: 4,
    riskOnly: false
  },
  {
    id: "mcp-servers",
    title: "推荐 MCP Servers",
    description: "让 Agent 接入 GitHub、浏览器、数据库、文档和外部数据源。",
    types: ["mcp_server"],
    limit: 5,
    riskOnly: false
  },
  {
    id: "github-plugins",
    title: "推荐 GitHub 插件",
    description: "增强仓库协作、PR 检查、Issue 到代码和上线质量控制。",
    types: ["github_plugin"],
    limit: 3,
    riskOnly: false
  },
  {
    id: "ui-libraries",
    title: "推荐 UI 组件库",
    description: "优先选择低风险、可控、适合 AI SaaS 和后台工作台的 UI 资源。",
    types: ["ui_component"],
    limit: 4,
    riskOnly: false
  },
  {
    id: "template-repos",
    title: "推荐模板仓库",
    description: "作为项目骨架、数据库接入、AI 能力和推荐系统落地参考。",
    types: ["template_repo"],
    limit: 6,
    riskOnly: false
  },
  {
    id: "optional-enhancements",
    title: "可选增强工具",
    description: "仅在项目复杂度上升后再接入，用于自动化、动效、记忆或更强协作。",
    types: ["agent_skill", "mcp_server", "github_plugin", "ui_component", "template_repo"],
    limit: 4,
    requiredTags: ["automation", "memory", "animation", "ai-sdk", "review", "v0"]
  },
  {
    id: "risk-alerts",
    title: "高风险候选（人工复核）",
    description: "这些资源可能与项目相关，但存在许可证、维护或社区验证风险，不会进入默认实施方案。",
    types: ["agent_skill", "mcp_server", "github_plugin", "ui_component", "template_repo"],
    limit: 4,
    riskOnly: true
  }
];

const baselineTagsByGroup: Record<string, string[]> = {
  "required-skills": ["codex", "browser", "testing", "docs", "skills", "agent-skill", "agent-skills", "coding", "workflow", "ai"],
  "mcp-servers": ["mcp", "mcp-server", "registry", "playwright", "context7", "github", "filesystem", "browser", "database", "ai"],
  "github-plugins": ["github", "actions", "review", "copilot", "connector", "github-plugin", "github-app", "code-review", "automation"],
  "template-repos": ["template", "starter", "boilerplate", "example", "nextjs", "react", "fullstack", "database", "ai-sdk", "vercel"],
  "optional-enhancements": ["automation", "memory", "animation", "ai-sdk", "review", "v0"]
};

export function extractProjectKeywords(input: string) {
  const normalized = input.toLowerCase();
  const english = normalized.match(/[a-z0-9][a-z0-9/-]{1,}/g) ?? [];
  const chinese = input.match(/[\u4e00-\u9fa5]{2,}/g) ?? [];
  const domainMatches = capabilityModules.flatMap((module) =>
    module.keywords.filter((keyword) => normalized.includes(keyword.toLowerCase()) || input.includes(keyword))
  );

  return Array.from(new Set([...chinese, ...english, ...domainMatches]))
    .map((keyword) => keyword.trim())
    .filter((keyword) => keyword.length > 1 && !stopWords.has(keyword))
    .slice(0, 18);
}

export function detectCapabilityModules(input: string, keywords = extractProjectKeywords(input), includeFallback = true) {
  const searchable = `${input} ${keywords.join(" ")}`.toLowerCase();
  const searchableTokens: string[] = searchable.match(/[a-z0-9-]+/g) ?? [];
  const matched = capabilityModules
    .map((module) => {
      const hits = module.keywords.filter((keyword) => {
        const normalizedKeyword = keyword.toLowerCase();
        return /^[a-z0-9-]+$/.test(normalizedKeyword)
          ? searchableTokens.includes(normalizedKeyword)
          : searchable.includes(normalizedKeyword);
      });
      return { module, hits };
    })
    .filter(({ hits }) => hits.length > 0)
    .sort((a, b) => b.hits.length - a.hits.length)
    .map(({ module }) => module);

  const defaultIds = ["agent-workflow", "ui-components", "database-storage", "automated-testing"];
  const fallback = capabilityModules.filter((module) => defaultIds.includes(module.id));

  return dedupeModules(includeFallback ? [...matched, ...fallback] : matched).slice(0, 7);
}

export function buildProjectRecommendation(input: string, resources: Resource[], context: RecommendationContext = {}): ProjectRecommendation {
  const keywords = extractProjectKeywords(input);
  const moduleInput = `${input} ${(context.coreFeatures ?? []).join(" ")}`;
  const modules = detectCapabilityModules(moduleInput, keywords);
  const matchedModules = detectCapabilityModules(moduleInput, keywords, false);
  const scoringModules = matchedModules.length > 0 ? matchedModules : modules;
  const understanding = buildProjectUnderstanding(input, keywords, modules, context);
  const scored = scoreResources(resources, [...keywords, ...(context.coreFeatures ?? [])], scoringModules);
  const selectedIds = new Set<string>();

  const groups = groupDefinitions.map((group) => {
    const matching = scored
      .filter((item) => group.types.includes(item.resource.type))
      .filter((item) => !group.requiredTags || hasAnyTag(item.resource, group.requiredTags))
      .filter((item) => group.riskOnly ? item.resource.risk_level === "high" : item.resource.risk_level !== "high")
      .filter((item) => !selectedIds.has(item.resource.id))
      .filter((item) => group.riskOnly || item.hasProjectSignal);
    const baseline = scored
      .filter((item) => !group.riskOnly && !item.hasProjectSignal)
      .filter((item) => group.types.includes(item.resource.type))
      .filter((item) => item.resource.risk_level !== "high")
      .filter((item) => !group.requiredTags || hasAnyTag(item.resource, group.requiredTags))
      .filter((item) => baselineTagsByGroup[group.id]?.some((tag) => hasAnyTag(item.resource, [tag])))
      .filter((item) => !selectedIds.has(item.resource.id));
    const candidates = [...matching, ...baseline]
      .filter((item, index, items) => items.findIndex((candidate) => candidate.resource.id === item.resource.id) === index)
      .slice(0, group.limit);

    candidates.forEach((item) => selectedIds.add(item.resource.id));

    const items = candidates.map((item) => ({
      ...item,
      why: buildReason(item.resource, scoringModules, keywords),
      stage: buildStage(item.resource, scoringModules),
      install: item.resource.install_command,
      risk: item.resource.risk_level,
      alternative: buildAlternative(item.resource, resources),
      matchKind: (group.riskOnly ? "risk" : item.hasProjectSignal ? "domain" : "baseline") as RecommendedResource["matchKind"]
    }));

    return {
      id: group.id,
      title: group.title,
      description: group.description,
      items,
      gap: items.length === 0 && !group.riskOnly ? buildGap(group.title, group.types) : undefined
    };
  });

  const gaps = buildGaps(groups, modules);

  return {
    understanding,
    keywords,
    modules,
    groups,
    gaps,
    codexPrompt: buildCodexPrompt(input, understanding, modules, groups, gaps)
  };
}

function buildProjectUnderstanding(input: string, keywords: string[], modules: CapabilityModule[], context: RecommendationContext): ProjectUnderstanding {
  const text = input.toLowerCase();
  const has = (values: string[]) => values.some((value) => text.includes(value.toLowerCase()) || input.includes(value));
  const recipeProject = has(["菜谱", "食谱", "做饭", "饭菜", "吃什么", "食材", "烹饪", "recipe", "food", "meal", "ingredients", "cooking"]);

  const projectType = context.projectType ?? (recipeProject ? "菜谱与用餐决策 Web 应用" :
    has(["外贸", "客户", "线索", "获客", "lead"]) ? "获客/线索发现系统" :
    has(["知识库", "搜索", "文档", "问答"]) ? "知识库与搜索推荐系统" :
    has(["后台", "管理", "dashboard", "saas"]) ? "SaaS 工作台/管理后台" :
    "AI 辅助 Web 应用");

  const targetUsers = context.targetUsers ?? (recipeProject ? "家庭用户、个人用户和需要快速决定吃什么的人" :
    has(["销售", "外贸", "客户", "运营"]) ? "销售、运营或业务拓展团队" :
    has(["开发者", "agent", "codex"]) ? "开发者与 AI Agent 使用者" :
    "需要把业务需求转成可执行工作流的产品/运营用户");

  const featureSet = context.coreFeatures?.length ? context.coreFeatures : recipeProject ? [
    "根据用餐人数推荐菜品",
    "随机推荐与条件筛选",
    "展示食材和备菜清单",
    "展示分步骤制作过程",
    "移动端烹饪阅读与完成状态"
  ] : [
    has(["输入", "描述", "需求", "prompt"]) ? "项目需求输入与结构化理解" : "需求录入与参数配置",
    ...modules.slice(0, 5).map((module) => module.label),
    has(["导出", "excel", "csv", "报告"]) ? "结果导出与报告生成" : "结果保存与复用"
  ];

  const dataSources = recipeProject ? [
    "内置菜谱、食材、份量和制作步骤数据",
    "用户选择的用餐人数与偏好参数",
    "可选的官方菜谱 API 或公开数据源"
  ] : [
    has(["网页", "官网", "爬取", "crawl", "scrape"]) ? "公开网页和官网内容" : "用户输入的项目描述",
    has(["github", "仓库", "issue", "pr"]) ? "GitHub 仓库、Issue 与 PR" : "本地 curated 资源库",
    has(["文档", "pdf", "word", "excel"]) ? "上传文档、表格或报告" : "资源标签、评分和风险元数据"
  ];

  const techStack = context.techStack?.length ? context.techStack : [
    "Next.js + TypeScript",
    "Tailwind CSS + shadcn/ui",
    has(["数据库", "保存", "用户", "搜索", "推荐", "supabase"]) ? "Supabase/Postgres" : "本地数据层，后续可接 Supabase",
    has(["搜索", "推荐", "语义", "向量", "pgvector"]) ? "pgvector/embeddings 预留" : "规则匹配优先，保留语义检索接口",
    "Codex Skills + MCP Servers"
  ];

  return {
    projectType,
    targetUsers,
    coreFeatures: Array.from(new Set(featureSet)).slice(0, 7),
    dataSources: Array.from(new Set(dataSources)),
    techStack
  };
}

function scoreResources(resources: Resource[], keywords: string[], modules: CapabilityModule[]) {
  const genericKeywords = new Set([
    "web", "web-app", "web application", "saas", "dashboard", "postgresql", "postgres", "next", "nextjs", "next.js",
    "react", "node", "nodejs", "js", "typescript", "javascript", "express", "mongodb", "mongoose", "vercel", "docker",
    "responsive", "user-friendly", "dynamic-content", "api", "fullstack", "frontend", "backend"
  ]);
  const meaningfulKeywords = keywords.filter((keyword) =>
    keyword.length <= 18 && !genericKeywords.has(keyword.toLowerCase()) && !["开发", "系统", "平台", "项目", "应用", "网页"].includes(keyword)
  );
  const moduleTags = modules.flatMap((module) => module.preferredTags);
  const scoringModuleKeywords = modules.flatMap((module) => module.keywords);
  const scoringModuleTypes = modules.flatMap((module) => module.preferredTypes);

  return resources
    .map((resource) => {
      const haystack = [
        resource.name,
        resource.description,
        resource.type,
        resource.install_command,
        ...resource.tags,
        ...resource.supported_agents,
        ...resource.use_cases
      ].join(" ").toLowerCase();

      const keywordHits = meaningfulKeywords.filter((keyword) => haystack.includes(keyword.toLowerCase())).length;
      const moduleKeywordHits = scoringModuleKeywords.filter((keyword) => haystack.includes(keyword.toLowerCase())).length;
      const normalizedModuleTags = moduleTags.map((tag) => tag.toLowerCase());
      const tagHits = resource.tags.filter((tag) => normalizedModuleTags.includes(tag.toLowerCase()) && meaningfulKeywords.some((keyword) => tag.toLowerCase().includes(keyword.toLowerCase()))).length;
      const typeBoost = scoringModuleTypes.includes(resource.type) ? 14 : 0;
      const riskPenalty = resource.risk_level === "high" ? 22 : resource.risk_level === "medium" ? 6 : 0;
      const universalUiSignal = resource.type === "ui_component" && resource.tags.some((tag) => ["ui", "components", "shadcn", "tailwind", "react"].includes(tag.toLowerCase()));
      const hasBaselineSignal = resource.tags.some((tag) => [
        "codex", "browser", "testing", "docs", "skills", "agent-skill", "agent-skills", "coding", "workflow", "ai",
        "mcp", "mcp-server", "registry", "playwright", "context7", "github", "filesystem", "database",
        "actions", "review", "copilot", "connector", "github-plugin", "github-app", "code-review", "automation",
        "template", "starter", "boilerplate", "example", "nextjs", "react", "fullstack", "ai-sdk", "vercel", "memory", "animation", "v0"
      ].includes(tag.toLowerCase()));
      const hasProjectSignal = keywordHits > 0 || moduleKeywordHits > 0 || tagHits > 0 || universalUiSignal;
      const score =
        keywordHits * 11 +
        moduleKeywordHits * 4 +
        tagHits * 10 +
        typeBoost +
        resource.fit_score * 0.44 +
        resource.trust_score * 0.38 -
        riskPenalty;

      return { resource, score, hasProjectSignal, hasBaselineSignal };
    })
    .filter((item) => item.score >= 52 && (item.hasProjectSignal || item.hasBaselineSignal))
    .sort((a, b) => b.score - a.score);
}

function hasAnyTag(resource: Resource, tags: string[]) {
  const resourceTags = new Set(resource.tags.map((tag) => tag.toLowerCase()));
  return tags.some((tag) => resourceTags.has(tag.toLowerCase()));
}

function buildReason(resource: Resource, modules: CapabilityModule[], keywords: string[]) {
  const matchedModules = modules.filter((module) =>
    module.preferredTypes.includes(resource.type) || resource.tags.some((tag) => module.preferredTags.includes(tag))
  );
  const moduleLabel = matchedModules[0]?.label ?? typeLabels[resource.type];
  const keywordHit = keywords.find((keyword) =>
    `${resource.name} ${resource.description} ${resource.tags.join(" ")}`.toLowerCase().includes(keyword.toLowerCase())
  );
  const trustSignal = `可信度 ${resource.trust_score}/100，适配度 ${resource.fit_score}/100，风险为 ${resource.risk_level}；风险依据：${getRiskReason(resource)}`;

  if (matchedModules.length === 0) {
    return `基础工程能力候选；${trustSignal}，用于补齐项目开发、验证或交付环节。`;
  }

  if (keywordHit) {
    return `匹配“${keywordHit}”及${moduleLabel}环节；${trustSignal}，适合作为优先候选。`;
  }

  return `覆盖${moduleLabel}能力；${trustSignal}，与当前能力组合的基础设施需求一致。`;
}

function buildStage(resource: Resource, modules: CapabilityModule[]) {
  const matchedModule = modules.find(
    (module) => module.preferredTypes.includes(resource.type) || resource.tags.some((tag) => module.preferredTags.includes(tag))
  );

  return matchedModule?.projectStage ?? "项目搭建、工程增强和交付质量控制";
}

function buildAlternative(resource: Resource, resources: Resource[]) {
  const sameType = resources
    .filter((item) => item.id !== resource.id && item.type === resource.type && item.risk_level !== "high")
    .sort((a, b) => b.trust_score + b.fit_score - (a.trust_score + a.fit_score))[0];

  if (sameType) {
    return `${sameType.name}，或先用本地实现替代后再接入外部服务。`;
  }

  return "当前资源库没有同类型低风险替代项，建议先用本地轻量实现并记录缺口。";
}

function buildGap(groupTitle: string, types: ResourceType[]) {
  return `${groupTitle} 暂无强匹配资源。资源库需要补充 ${types.map((type) => typeLabels[type]).join(" / ")} 类型的高可信条目。`;
}

function buildGaps(groups: RecommendationGroup[], modules: CapabilityModule[]) {
  const emptyGroupGaps = groups.flatMap((group) => group.gap ? [group.gap] : []);
  const moduleGaps = modules
    .filter((module) => module.id === "document-parsing")
    .map(() => "当前资源库缺少专门的 PDF/Word/Excel 文档解析 Skill 或 MCP Server，可后续补充 documents/spreadsheets/pdf 类资源。");

  return Array.from(new Set([...emptyGroupGaps, ...moduleGaps]));
}

function buildCodexPrompt(
  input: string,
  understanding: ProjectUnderstanding,
  modules: CapabilityModule[],
  groups: RecommendationGroup[],
  gaps: string[]
) {
  const groupText = groups
    .map((group) => {
      if (group.items.length === 0) {
        return `${group.title}\n- 缺口：${group.gap}`;
      }

      const items = group.items
        .map(
          (item) =>
            `- ${item.resource.name}\n  - 为什么推荐：${item.why}\n  - 使用环节：${item.stage}\n  - 安装方式：${item.install}\n  - 风险等级：${item.risk}\n  - 风险依据：${getRiskReason(item.resource)}\n  - 替代方案：${item.alternative}`
        )
        .join("\n");
      return `${group.title}\n${items}`;
    })
    .join("\n\n");

  const moduleText = modules.map((module) => `- ${module.label}: ${module.description}`).join("\n");
  const featureText = understanding.coreFeatures.map((feature) => `- ${feature}`).join("\n");
  const sourceText = understanding.dataSources.map((source) => `- ${source}`).join("\n");
  const stackText = understanding.techStack.map((item) => `- ${item}`).join("\n");
  const gapText = gaps.length > 0 ? gaps.map((gap) => `- ${gap}`).join("\n") : "- 暂无关键缺口，先按推荐组合实现 MVP。";

  return `请作为 Codex 帮我开发以下项目，并按“项目开发能力组合方案”执行。\n\n项目原始描述：\n${input}\n\n1. 项目需求理解\n- 项目类型：${understanding.projectType}\n- 目标用户：${understanding.targetUsers}\n- 核心功能：\n${featureText}\n- 可能的数据来源：\n${sourceText}\n- 推荐技术栈：\n${stackText}\n\n2. 所需能力模块\n${moduleText}\n\n3. 推荐资源组合\n${groupText}\n\n4. 当前缺口\n${gapText}\n\n5. 开发要求\n- 先实现项目原始描述中的核心用户流程，再补充后台和增强能力。\n- 严格遵循上面的推荐技术栈，不要擅自把数据库或 ORM 切换成其他方案。\n- 优先使用低风险、高可信、适配度高的资源；高风险候选只用于人工复核，不能直接作为生产依赖。\n- 不要只堆资源列表，要把每个资源绑定到具体开发阶段，并先核对许可证、维护状态、权限和数据边界。\n- 每次修改后运行相关构建、lint 或页面验证，并报告失败原因。`;
}

export function rebuildCodexPrompt(input: string, recommendation: ProjectRecommendation) {
  return buildCodexPrompt(input, recommendation.understanding, recommendation.modules, recommendation.groups, recommendation.gaps);
}

function dedupeModules(modules: CapabilityModule[]) {
  const seen = new Set<string>();
  return modules.filter((module) => {
    if (seen.has(module.id)) {
      return false;
    }
    seen.add(module.id);
    return true;
  });
}
