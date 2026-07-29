import type { Resource, ResourceType, RiskLevel } from "@/lib/types";
import type {
  CapabilityGraph,
  CapabilityPriority,
  ResourceRole
} from "@/lib/capability-engine";
import { typeLabels } from "@/lib/resource-types";
import { getRiskReason } from "@/lib/risk";
import {
  assessRequirementClarity,
  type RequirementClarity
} from "@/lib/requirement-clarity";
import { isResourceRecommendationEligible } from "@/lib/resource-verification";

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
  priority?: CapabilityPriority;
  resourceRoles?: ResourceRole[];
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
  matchedCapabilityIds: string[];
  capabilityCoverage: number;
  resourceRole?: ResourceRole;
};

export type RecommendationGroup = {
  id: string;
  title: string;
  description: string;
  items: RecommendedResource[];
  gap?: string;
};

export type ProjectRecommendation = {
  clarity: RequirementClarity;
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
  capabilityGraph?: CapabilityGraph;
  clarity?: RequirementClarity;
};

const capabilityModules: CapabilityModule[] = [
  {
    id: "stock-market-analysis",
    label: "股票行情与走势分析",
    description: "接入股票、指数和板块行情，展示金融图表与技术指标，并支持策略回测和投研分析。",
    keywords: [
      "炒股", "股票", "股市", "证券", "行情", "走势", "a股", "stock-market", "stock market", "stock trading",
      "market-data", "financial-data", "real-time-quotes", "candlestick", "technical-analysis", "macd", "rsi",
      "bollinger", "quantitative-trading", "quant-trading", "backtesting", "trading-strategy", "akshare", "mootdx",
      "qlib", "rqalpha", "daily-stock-analysis", "tradingagents"
    ],
    preferredTags: [
      "stock-market", "financial-data", "market-data", "real-time-quotes", "a-share", "technical-analysis",
      "quantitative-trading", "quant-trading", "backtesting", "trading-strategy", "multi-agent-research",
      "stock-analysis", "financial-charts", "candlestick"
    ],
    preferredTypes: ["agent_skill", "template_repo", "github_plugin", "mcp_server", "ui_component"],
    projectStage: "实时行情接入、K 线与分时图展示、技术指标计算、策略回测和多智能体投研"
  },
  {
    id: "image-to-3d",
    label: "2D 图像转 3D",
    description: "从单张或多张二维图像估计深度、几何结构和材质，并生成可预览、编辑或导出的三维模型。",
    keywords: [
      "2d转3d", "2d 转 3d", "2d-to-3d", "image-to-3d", "image to 3d", "img2threejs", "threejs", "three.js",
      "webgl", "3d-modeling", "3d modeling", "depth-estimation", "depth estimation", "mesh-generation", "mesh generation",
      "photogrammetry", "texture-mapping", "point-cloud", "model-viewer", "glb-format", "obj-format", "stl-format"
    ],
    preferredTags: [
      "2d-to-3d", "image-to-3d", "3d", "threejs", "webgl", "computer-graphics", "procedural-generation",
      "depth-estimation", "mesh-generation", "photogrammetry", "model-viewer"
    ],
    preferredTypes: ["agent_skill", "template_repo", "ui_component"],
    projectStage: "图像输入、深度与几何重建、Three.js/WebGL 预览、模型质量检查和 GLB/OBJ/STL 导出"
  },
  {
    id: "recipe-catalog",
    label: "菜谱与食材数据",
    description: "建立菜谱、食材、份量和制作步骤的数据模型，保证每道菜能被检索、展示和复用。",
    keywords: ["菜谱", "食谱", "饭菜", "料理", "食材", "中文菜谱", "recipe", "recipes", "food", "meal", "ingredients", "cooking", "howtocook"],
    preferredTags: ["recipe", "recipes", "food", "ingredients", "meal", "database", "chinese-recipes", "recipe-mcp"],
    preferredTypes: ["template_repo", "mcp_server", "agent_skill"],
    projectStage: "中文菜谱数据导入、食材关系、份量字段、制作步骤和菜谱查询接口"
  },
  {
    id: "meal-recommendation",
    label: "按人数与偏好的菜品推荐",
    description: "根据用餐人数、随机入口和筛选条件返回可解释的菜品结果，并保留推荐依据。",
    keywords: ["随机", "人数", "吃什么", "饭菜", "现有食材", "按食材", "recommendation", "random", "servings", "portion scaling", "meal planning", "what to cook", "ingredient recommendation"],
    preferredTags: ["recipe", "meal-planning", "recommendation", "random-meal", "servings", "portion-scaling", "ingredient-recommendation"],
    preferredTypes: ["template_repo", "ui_component", "mcp_server", "agent_skill"],
    projectStage: "现有食材匹配、人数参数、份量换算、筛选排序和推荐结果页"
  },
  {
    id: "personalized-nutrition",
    label: "忌口、年龄与营养约束",
    description: "根据年龄、身体指标、营养目标、忌口、过敏原和饮食偏好过滤并排序菜品。",
    keywords: [
      "年龄", "老人", "儿童", "忌口", "过敏", "营养", "健康", "饮食偏好", "减脂", "增肌",
      "age", "allergy", "allergen", "dietary restrictions", "nutrition", "health conditions",
      "calorie", "macro", "personalized nutrition", "food preferences", "macrochef"
    ],
    preferredTags: [
      "age-aware", "food-allergies", "dietary-restrictions", "personalized-nutrition", "nutrition",
      "health-conditions", "calorie", "macro", "food-preferences"
    ],
    preferredTypes: ["template_repo", "agent_skill", "mcp_server"],
    projectStage: "用户饮食档案、年龄与营养规则、过敏原硬过滤、健康目标排序和风险提示"
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
    limit: 8,
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
  "ui-libraries": ["ui", "components", "shadcn", "tailwind", "react", "threejs", "webgl", "model-viewer"],
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
  const clarity = context.clarity ?? assessRequirementClarity(input);
  const keywords = extractProjectKeywords(input);
  const moduleInput = `${input} ${(context.coreFeatures ?? []).join(" ")}`;
  const dynamicModules = capabilityGraphToModules(context.capabilityGraph);
  const detectedModules = detectCapabilityModules(moduleInput, keywords, clarity.confidence !== "low");
  const modules = dedupeModules([...dynamicModules, ...detectedModules]).slice(0, 10);
  const matchedModules = dedupeModules([
    ...dynamicModules,
    ...detectCapabilityModules(moduleInput, keywords, false)
  ]);
  const infrastructureModuleIds = new Set(["document-parsing", "database-storage", "ui-components", "automated-testing", "deployment", "agent-workflow"]);
  const domainModules = matchedModules.filter((module) => !infrastructureModuleIds.has(module.id));
  const scoringModules = domainModules.length > 0 ? domainModules : matchedModules.length > 0 ? matchedModules : modules;
  const understanding = buildProjectUnderstanding(input, keywords, modules, context, clarity);
  const scored = scoreResources(
    resources,
    [...keywords, ...(context.coreFeatures ?? [])],
    scoringModules,
    context.capabilityGraph
  );
  const bundle = selectCapabilityBundle(scored, context.capabilityGraph);
  const selectedIds = new Set<string>();

  const groups = groupDefinitions.map((group) => {
    const matching = scored
      .filter((item) => group.riskOnly ? bundle.riskIds.has(item.resource.id) : bundle.defaultIds.has(item.resource.id))
      .filter((item) => group.types.includes(item.resource.type))
      .filter((item) => !group.requiredTags || hasAnyTag(item.resource, group.requiredTags))
      .filter((item) => group.riskOnly ? item.resource.risk_level === "high" : item.resource.risk_level !== "high")
      .filter((item) => !selectedIds.has(item.resource.id))
      .filter((item) => clarity.confidence !== "low" || item.matchedCapabilityIds.length > 0)
      .filter((item) => group.riskOnly || item.hasProjectSignal);
    const baseline = scored
      .filter(() => !context.capabilityGraph)
      .filter((item) => !group.riskOnly && !item.hasProjectSignal)
      .filter((item) => group.types.includes(item.resource.type))
      .filter((item) => item.resource.risk_level !== "high")
      .filter((item) => !group.requiredTags || hasAnyTag(item.resource, group.requiredTags))
      .filter((item) => baselineTagsByGroup[group.id]?.some((tag) => hasAnyTag(item.resource, [tag])))
      .filter((item) => !selectedIds.has(item.resource.id))
      .slice(0, matching.length > 0 || Boolean(group.requiredTags) ? 0 : 1);
    const candidates = selectDiverseCandidates(
      [...matching, ...baseline]
        .filter((item, index, items) => items.findIndex((candidate) => candidate.resource.id === item.resource.id) === index),
      group.limit,
      context.capabilityGraph
    );

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

  const gaps = buildGaps(groups, modules, context.capabilityGraph);

  return {
    clarity,
    understanding,
    keywords,
    modules,
    groups,
    gaps,
    codexPrompt: buildCodexPrompt(input, understanding, modules, groups, gaps, clarity)
  };
}

function buildProjectUnderstanding(
  input: string,
  keywords: string[],
  modules: CapabilityModule[],
  context: RecommendationContext,
  clarity: RequirementClarity
): ProjectUnderstanding {
  const text = input.toLowerCase();
  const has = (values: string[]) => values.some((value) => text.includes(value.toLowerCase()) || input.includes(value));
  const recipeProject = has(["菜谱", "食谱", "做饭", "饭菜", "吃什么", "食材", "烹饪", "recipe", "food", "meal", "ingredients", "cooking"]);
  const isLowConfidence = clarity.confidence === "low";

  const projectType = isLowConfidence ? `${input.trim() || "当前主题"}相关产品（具体形态待确认）` :
    context.projectType ?? (recipeProject ? "菜谱与用餐决策 Web 应用" :
    has(["外贸", "客户", "线索", "获客", "lead"]) ? "获客/线索发现系统" :
    has(["知识库", "搜索", "文档", "问答"]) ? "知识库与搜索推荐系统" :
    has(["后台", "管理", "dashboard", "saas"]) ? "SaaS 工作台/管理后台" :
    "AI 辅助 Web 应用");

  const targetUsers = isLowConfidence ? "待确认，不能仅根据主题推断目标用户" :
    context.targetUsers ?? (recipeProject ? "家庭用户、个人用户和需要快速决定吃什么的人" :
    has(["销售", "外贸", "客户", "运营"]) ? "销售、运营或业务拓展团队" :
    has(["开发者", "agent", "codex"]) ? "开发者与 AI Agent 使用者" :
    "需要把业务需求转成可执行工作流的产品/运营用户");

  const featureSet = isLowConfidence ? clarity.confirmedRequirements :
    context.coreFeatures?.length ? context.coreFeatures : recipeProject ? [
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

  const dataSources = isLowConfidence ? [
    "待产品方向确认后，再确定菜谱、餐厅、商家、定位或用户内容等数据来源"
  ] : recipeProject ? [
    "内置菜谱、食材、份量和制作步骤数据",
    "用户选择的用餐人数与偏好参数",
    "可选的官方菜谱 API 或公开数据源"
  ] : [
    has(["网页", "官网", "爬取", "crawl", "scrape"]) ? "公开网页和官网内容" : "用户输入的项目描述",
    has(["github", "仓库", "issue", "pr"]) ? "GitHub 仓库、Issue 与 PR" : "本地 curated 资源库",
    has(["文档", "pdf", "word", "excel"]) ? "上传文档、表格或报告" : "资源标签、评分和风险元数据"
  ];

  const techStack = isLowConfidence ? [
    "暂不锁定技术栈；先确认产品方向、核心流程、数据来源和上线平台"
  ] : context.techStack?.length ? context.techStack : [
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

function scoreResources(
  resources: Resource[],
  keywords: string[],
  modules: CapabilityModule[],
  capabilityGraph?: CapabilityGraph
) {
  const genericKeywords = new Set([
    "web", "web-app", "web application", "saas", "dashboard", "postgresql", "postgres", "next", "nextjs", "next.js",
    "react", "node", "nodejs", "js", "typescript", "javascript", "express", "mongodb", "mongoose", "vercel", "docker",
    "responsive", "user-friendly", "dynamic-content", "api", "fullstack", "frontend", "backend",
    "skill", "skills", "github", "plugin", "plugins", "agent"
  ]);
  const meaningfulKeywords = keywords.filter((keyword) =>
    keyword.length <= 18 && !genericKeywords.has(keyword.toLowerCase()) && !["开发", "系统", "平台", "项目", "应用", "网页"].includes(keyword)
  );
  const moduleTags = modules.flatMap((module) => module.preferredTags);
  const scoringModuleKeywords = modules.flatMap((module) => module.keywords);
  const scoringModuleTypes = modules.flatMap((module) => module.preferredTypes);

  return resources
    .filter(isResourceRecommendationEligible)
    .filter((resource) => !hasCapabilityDomainConflict(resource, capabilityGraph))
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
      const strongKeywordHits = meaningfulKeywords.filter((keyword) => keyword.length >= 4 && haystack.includes(keyword.toLowerCase())).length;
      const moduleKeywordHits = scoringModuleKeywords.filter((keyword) => haystack.includes(keyword.toLowerCase())).length;
      const normalizedModuleTags = moduleTags.map((tag) => tag.toLowerCase());
      const tagHits = resource.tags.filter((tag) => normalizedModuleTags.includes(tag.toLowerCase()) && meaningfulKeywords.some((keyword) => tag.toLowerCase().includes(keyword.toLowerCase()))).length;
      const typeBoost = scoringModuleTypes.includes(resource.type) ? 8 : 0;
      const curatedBoost = Math.min(20, Math.max(0, resource.ai_recommendation_weight ?? 0) * 0.2);
      const matchedCapabilities = (capabilityGraph?.capabilities ?? []).filter((capability) =>
        matchesCapabilityEvidence(haystack, capability, capabilityGraph)
      );
      const coreCapabilities = capabilityGraph?.capabilities.filter((capability) => capability.priority === "core") ?? [];
      const requiredCapabilities = capabilityGraph?.capabilities.filter((capability) => capability.priority === "required") ?? [];
      const matchedCore = matchedCapabilities.filter((capability) => capability.priority === "core");
      const matchedRequired = matchedCapabilities.filter((capability) => capability.priority === "required");
      const capabilityWeight = Math.max(1, coreCapabilities.length * 2 + requiredCapabilities.length);
      const capabilityCoverage = (matchedCore.length * 2 + matchedRequired.length) / capabilityWeight;
      const inspectedCapabilityHits = new Set(resource.matched_capabilities ?? []);
      const evidenceHits = matchedCapabilities.filter((capability) => inspectedCapabilityHits.has(capability.id)).length;
      const negativeHits = (capabilityGraph?.capabilities ?? []).flatMap((capability) =>
        capability.negativeKeywords.filter((keyword) => matchesScoringTerm(haystack, keyword))
      ).length;
      const riskPenalty = resource.risk_level === "high" ? 16 : resource.risk_level === "medium" ? 5 : 0;
      const universalUiSignal = resource.type === "ui_component"
        && (
          isOfficialShadcnUi(resource)
          || (
            modules.some((module) => module.id === "ui-components")
            && resource.tags.some((tag) => ["ui", "components", "shadcn", "tailwind", "react"].includes(tag.toLowerCase()))
          )
        );
      const foundationalUiBoost = resource.type === "ui_component"
        ? isOfficialShadcnUi(resource)
          ? 30
          : resource.tags.some((tag) => ["shadcn", "radix"].includes(tag.toLowerCase()))
            ? 18
            : resource.tags.some((tag) => ["ui", "components", "design-system"].includes(tag.toLowerCase()))
              ? 6
              : 0
        : 0;
      const hasBaselineSignal = resource.tags.some((tag) => [
        "codex", "browser", "testing", "docs", "skills", "agent-skill", "agent-skills", "coding", "workflow", "ai",
        "mcp", "mcp-server", "registry", "playwright", "context7", "github", "filesystem", "database",
        "actions", "review", "copilot", "connector", "github-plugin", "github-app", "code-review", "automation",
        "template", "starter", "boilerplate", "example", "nextjs", "react", "fullstack", "ai-sdk", "vercel", "memory", "animation", "v0"
      ].includes(tag.toLowerCase()));
      const hasProjectSignal = strongKeywordHits > 0
        || moduleKeywordHits >= 2
        || tagHits > 0
        || matchedCapabilities.length > 0
        || evidenceHits > 0
        || universalUiSignal;
      const hasVerifiedCapability = matchedCore.length > 0 || matchedRequired.length > 0;
      const resourceRole = inferResourceRole(resource, matchedCapabilities);
      const genericTemplatePenalty = resource.type === "template_repo"
        && resourceRole === "project_template"
        && matchedCore.length === 0
        ? 20
        : 0;
      const score = Math.min(100,
        keywordHits * 3 +
        moduleKeywordHits * 2 +
        tagHits * 4 +
        Math.min(typeBoost, 5) +
        curatedBoost +
        capabilityCoverage * 35 +
        matchedCore.length * 18 +
        matchedRequired.length * 10 +
        evidenceHits * 8 -
        negativeHits * 20 +
        foundationalUiBoost +
        resource.fit_score * 0.18 +
        resource.trust_score * 0.15 -
        riskPenalty -
        genericTemplatePenalty
      );

      return {
        resource,
        score,
        hasProjectSignal: capabilityGraph ? hasVerifiedCapability || universalUiSignal : hasProjectSignal,
        hasBaselineSignal: capabilityGraph ? universalUiSignal : hasBaselineSignal,
        matchedCapabilityIds: matchedCapabilities.map((capability) => capability.id),
        capabilityCoverage,
        resourceRole
      };
    })
    .filter((item) => item.score >= 50 && (item.hasProjectSignal || item.hasBaselineSignal))
    .sort((a, b) => b.score - a.score);
}

function hasAnyTag(resource: Resource, tags: string[]) {
  const resourceTags = new Set(resource.tags.map((tag) => tag.toLowerCase()));
  return tags.some((tag) => resourceTags.has(tag.toLowerCase()));
}

function isOfficialShadcnUi(resource: Resource) {
  return resource.name.toLowerCase() === "shadcn/ui"
    || resource.repo_url.toLowerCase().replace(/\/+$/, "").endsWith("github.com/shadcn-ui/ui");
}

function matchesScoringTerm(haystack: string, term: string) {
  const normalized = term.toLowerCase().trim();
  if (normalized.length < 3) return false;
  const normalizedHaystack = haystack.replace(/[-_]+/g, " ");
  const normalizedTerm = normalized.replace(/[-_]+/g, " ");
  return haystack.includes(normalized) || normalizedHaystack.includes(normalizedTerm);
}

function matchesCapabilityEvidence(
  haystack: string,
  capability: CapabilityGraph["capabilities"][number],
  capabilityGraph?: CapabilityGraph
) {
  if (capability.negativeKeywords.some((keyword) => matchesScoringTerm(haystack, keyword))) return false;
  if (!capability.keywords.some((keyword) => matchesScoringTerm(haystack, keyword))) return false;
  if (!isShortVideoGraph(capabilityGraph)) return true;

  const capabilitySource = `${capability.id} ${capability.label} ${capability.keywords.join(" ")}`.toLowerCase();
  if (/(short.video|text.to.video|视频生成|短视频生成)/i.test(capabilitySource)) {
    return /(short[- ]video|text[- ]to[- ]video|ai[- ]video[- ]generator|video generation|generate.{0,24}video|视频生成|生成.{0,12}短视频)/i.test(haystack);
  }
  if (/(video.render|video.edit|video.composition|视频渲染|视频编辑|视频合成)/i.test(capabilitySource)) {
    return /(video composition|video rendering|video editing|video encoding|moviepy video|remotion video|视频合成|视频渲染|视频编辑)/i.test(haystack);
  }
  if (/(auto.caption|subtitles|caption alignment|自动字幕|字幕对齐)/i.test(capabilitySource)) {
    return /(automatic subtitles|video captions?|caption alignment|speech-to-text|automatic speech recognition|自动字幕|字幕对齐)/i.test(haystack);
  }
  if (/(voiceover|text.to.speech|speech synthesis|配音|语音合成)/i.test(capabilitySource)) {
    return /(text-to-speech|\btts\b|voiceover|speech synthesis|配音|语音合成)/i.test(haystack);
  }
  if (/(video.template|pre-built video scenes|视频模板|预设场景)/i.test(capabilitySource)) {
    return /(video templates?|short video templates?|pre-built video scenes?|vertical video templates?|视频模板|预设场景)/i.test(haystack);
  }
  if (/(workflow|automation|pipeline|agent tool|工具工作流)/i.test(capabilitySource)) {
    return hasShortVideoEvidence(haystack);
  }

  return true;
}

function hasCapabilityDomainConflict(resource: Resource, capabilityGraph?: CapabilityGraph) {
  if (!isShortVideoGraph(capabilityGraph) || resource.type === "ui_component") return false;
  const source = `${resource.name} ${resource.description} ${resource.tags.join(" ")} ${resource.use_cases.join(" ")}`.toLowerCase();
  if (hasShortVideoEvidence(source)) return false;
  return /(\berp\b|erpnext|enterprise resource planning|inventory management|procurement|accounting|laravel agent|neuron-laravel|generic agent framework)/i.test(source);
}

function isShortVideoGraph(capabilityGraph?: CapabilityGraph) {
  if (!capabilityGraph) return false;
  const source = `${capabilityGraph.domain} ${capabilityGraph.capabilities
    .flatMap((capability) => [capability.id, capability.label, ...capability.keywords])
    .join(" ")}`.toLowerCase();
  return /(short.video|text.to.video|ai.video.generator|video.generation|视频生成|短视频)/i.test(source);
}

function hasShortVideoEvidence(source: string) {
  return /(short[- ]video|text[- ]to[- ]video|ai[- ]video[- ]generator|video generation|video composition|video rendering|video editing|moviepy video|remotion video|stock footage|automatic subtitles|video captions?|vertical video|视频生成|短视频|视频合成|视频渲染|视频编辑|视频素材|自动字幕)/i.test(source);
}

function selectDiverseCandidates<T extends {
  score: number;
  matchedCapabilityIds: string[];
}>(
  candidates: T[],
  limit: number,
  capabilityGraph?: CapabilityGraph
) {
  if (!capabilityGraph || candidates.length <= 1) return candidates.slice(0, limit);

  const requiredIds = new Set(
    capabilityGraph.capabilities.filter((capability) => capability.required).map((capability) => capability.id)
  );
  const covered = new Set<string>();
  const remaining = [...candidates];
  const selected: T[] = [];

  while (remaining.length > 0 && selected.length < limit) {
    remaining.sort((left, right) => {
      const leftNew = left.matchedCapabilityIds.filter((id) => requiredIds.has(id) && !covered.has(id)).length;
      const rightNew = right.matchedCapabilityIds.filter((id) => requiredIds.has(id) && !covered.has(id)).length;
      const leftRedundant = left.matchedCapabilityIds.filter((id) => covered.has(id)).length;
      const rightRedundant = right.matchedCapabilityIds.filter((id) => covered.has(id)).length;
      return (right.score + rightNew * 14 - rightRedundant * 2)
        - (left.score + leftNew * 14 - leftRedundant * 2);
    });
    const next = remaining.shift();
    if (!next) break;
    selected.push(next);
    next.matchedCapabilityIds.forEach((id) => covered.add(id));
  }

  return selected;
}

function selectCapabilityBundle<T extends {
  resource: Resource;
  score: number;
  matchedCapabilityIds: string[];
  resourceRole?: ResourceRole;
}>(
  scored: T[],
  capabilityGraph?: CapabilityGraph
) {
  if (!capabilityGraph) {
    return {
      defaultIds: new Set(scored.filter((item) => item.resource.risk_level !== "high").map((item) => item.resource.id)),
      riskIds: new Set(scored.filter((item) => item.resource.risk_level === "high").map((item) => item.resource.id))
    };
  }

  const defaultIds = new Set<string>();
  const importantCapabilities = capabilityGraph.capabilities
    .filter((capability) => capability.priority !== "optional")
    .sort((left, right) => priorityWeight(right.priority) - priorityWeight(left.priority));

  importantCapabilities.forEach((capability) => {
    const limit = capability.priority === "core" ? 3 : 2;
    scored
      .filter((item) => item.resource.risk_level !== "high")
      .filter((item) => item.matchedCapabilityIds.includes(capability.id))
      .slice(0, limit)
      .forEach((item) => defaultIds.add(item.resource.id));
  });

  scored
    .filter((item) => item.resource.risk_level !== "high")
    .filter((item) => item.matchedCapabilityIds.length >= 2)
    .slice(0, 3)
    .forEach((item) => defaultIds.add(item.resource.id));

  const foundationalUi = scored.find((item) =>
    item.resource.risk_level !== "high" && isOfficialShadcnUi(item.resource)
  );
  if (foundationalUi) defaultIds.add(foundationalUi.resource.id);

  const riskIds = new Set(
    scored
      .filter((item) => item.resource.risk_level === "high")
      .filter((item) => item.matchedCapabilityIds.length > 0)
      .slice(0, 4)
      .map((item) => item.resource.id)
  );

  return { defaultIds, riskIds };
}

function inferResourceRole(
  resource: Resource,
  matchedCapabilities: CapabilityGraph["capabilities"]
): ResourceRole {
  const preferredRoles = matchedCapabilities.flatMap((capability) => capability.resourceRoles);
  const source = `${resource.name} ${resource.description} ${resource.tags.join(" ")} ${resource.use_cases.join(" ")}`.toLowerCase();

  if (preferredRoles.includes("speech_to_text") && /(speech-to-text|speech recognition|transcri|\basr\b|语音识别|语音转写)/.test(source)) {
    return "speech_to_text";
  }
  if (preferredRoles.includes("text_to_speech") && /(text-to-speech|\btts\b|语音合成)/.test(source)) {
    return "text_to_speech";
  }
  if (preferredRoles.includes("domain_system")) return "domain_system";
  if (preferredRoles.includes("domain_data")) return "domain_data";
  if (preferredRoles.includes("domain_algorithm")) return "domain_algorithm";
  if (resource.type === "mcp_server") return "mcp_integration";
  if (resource.type === "ui_component") return "ui_library";
  if (resource.type === "template_repo") return "project_template";
  if (preferredRoles.includes("agent_tool")) return "agent_tool";
  return "developer_tool";
}

function priorityWeight(priority: CapabilityPriority) {
  return priority === "core" ? 3 : priority === "required" ? 2 : 1;
}

function buildReason(resource: Resource, modules: CapabilityModule[], keywords: string[]) {
  if (resource.evidence_summary && resource.matched_capabilities?.length) {
    return `${resource.evidence_summary}可信度 ${resource.trust_score}/100，资源基础质量 ${resource.fit_score}/100，风险为 ${resource.risk_level}；风险依据：${getRiskReason(resource)}`;
  }
  const matchedModules = modules.filter((module) =>
    module.preferredTypes.includes(resource.type) || resource.tags.some((tag) => module.preferredTags.includes(tag))
  );
  const moduleLabel = matchedModules[0]?.label ?? typeLabels[resource.type];
  const keywordHit = keywords.find((keyword) =>
    `${resource.name} ${resource.description} ${resource.tags.join(" ")}`.toLowerCase().includes(keyword.toLowerCase())
  );
  const trustSignal = `可信度 ${resource.trust_score}/100，资源基础质量 ${resource.fit_score}/100，风险为 ${resource.risk_level}；风险依据：${getRiskReason(resource)}`;

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

function buildGaps(groups: RecommendationGroup[], modules: CapabilityModule[], capabilityGraph?: CapabilityGraph) {
  const moduleGaps = modules
    .filter((module) => module.id === "document-parsing")
    .map(() => "当前资源库缺少专门的 PDF/Word/Excel 文档解析 Skill 或 MCP Server，可后续补充 documents/spreadsheets/pdf 类资源。");

  const coveredCapabilityIds = new Set(
    groups.flatMap((group) => group.items.flatMap((item) => item.matchedCapabilityIds))
  );
  const capabilityGaps = (capabilityGraph?.capabilities ?? [])
    .filter((capability) => capability.priority !== "optional")
    .filter((capability) => !coveredCapabilityIds.has(capability.id))
    .map((capability) =>
      `${capability.priority === "core" ? "核心" : "必需"}能力“${capability.label}”暂无经证据验证的匹配资源。`
    );

  return Array.from(new Set([...capabilityGaps, ...moduleGaps]));
}

function buildCodexPrompt(
  input: string,
  understanding: ProjectUnderstanding,
  modules: CapabilityModule[],
  groups: RecommendationGroup[],
  gaps: string[],
  clarity: RequirementClarity
) {
  const promptGroups = clarity.confidence === "low"
    ? groups.filter((group) => group.items.length > 0)
    : groups;
  const groupText = promptGroups
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
    .join("\n\n") || "当前没有足够证据推荐具体资源，待产品方向确认后重新检索。";

  const moduleText = modules.map((module) => `- ${module.label}: ${module.description}`).join("\n");
  const featureText = understanding.coreFeatures.map((feature) => `- ${feature}`).join("\n");
  const sourceText = understanding.dataSources.map((source) => `- ${source}`).join("\n");
  const stackText = understanding.techStack.map((item) => `- ${item}`).join("\n");
  const gapText = clarity.confidence === "low"
    ? "- 产品方向、目标用户和核心流程尚未确认；确认后需要重新生成能力图谱与资源组合。"
    : gaps.length > 0 ? gaps.map((gap) => `- ${gap}`).join("\n") : "- 暂无关键缺口，先按推荐组合实现 MVP。";
  const assumptionsText = clarity.assumptions.length > 0
    ? clarity.assumptions.map((item) => `- ${item}`).join("\n")
    : "- 暂无额外推测。";
  const questionsText = clarity.clarifyingQuestions.length > 0
    ? clarity.clarifyingQuestions.map((item) => `- ${item}`).join("\n")
    : "- 暂无阻塞性问题。";
  const lowConfidenceInstruction = clarity.confidence === "low"
    ? "当前输入不足以直接开发完整项目。先输出需求澄清结果和 2-3 个可选产品方向，等待用户确认后再创建代码、数据库 Schema 或部署配置。"
    : "先核对用户明确需求与建议方案，再实现最小可运行版本。";

  return `请作为 Codex 处理以下项目需求，并按“项目开发能力组合方案”执行。\n\n项目原始描述：\n${input}\n\n0. 需求完整度\n- 置信度：${clarity.confidence === "high" ? "高" : clarity.confidence === "medium" ? "中" : "低"}\n- 判断：${clarity.summary}\n- 当前推测：\n${assumptionsText}\n- 待确认问题：\n${questionsText}\n\n1. 当前项目理解\n- 项目类型：${understanding.projectType}\n- 目标用户：${understanding.targetUsers}\n- 已确认或可安全提取的核心需求：\n${featureText}\n- 可能的数据来源：\n${sourceText}\n- 建议技术栈：\n${stackText}\n\n2. 所需能力模块\n${moduleText}\n\n3. 候选资源组合\n${groupText}\n\n4. 当前缺口\n${gapText}\n\n5. 执行要求\n- ${lowConfidenceInstruction}\n- 只把用户原始描述和明确约束视为硬需求；项目类型、目标用户、功能扩展和技术栈均为可调整建议。\n- 不要因为出现“推荐”就默认引入向量数据库，也不要在用户未要求 AI 功能时默认引入 AI SDK。\n- 优先使用低风险、高可信、适配度高的资源；高风险候选只用于人工复核，不能直接作为生产依赖。\n- 每个资源必须绑定到具体开发环节，并先核对许可证、维护状态、权限和数据边界。\n- 每次修改后运行相关构建、lint 或页面验证，并报告失败原因。`;
}

export function rebuildCodexPrompt(input: string, recommendation: ProjectRecommendation) {
  return buildCodexPrompt(
    input,
    recommendation.understanding,
    recommendation.modules,
    recommendation.groups,
    recommendation.gaps,
    recommendation.clarity
  );
}

function capabilityGraphToModules(capabilityGraph?: CapabilityGraph): CapabilityModule[] {
  return (capabilityGraph?.capabilities ?? []).map((capability) => ({
    id: capability.id,
    label: capability.label,
    description: capability.description,
    keywords: capability.keywords,
    preferredTags: Array.from(new Set([capability.id, ...capability.keywords.map((keyword) => keyword.toLowerCase())])),
    preferredTypes: capability.preferredTypes,
    projectStage: capability.description,
    priority: capability.priority,
    resourceRoles: capability.resourceRoles
  }));
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
