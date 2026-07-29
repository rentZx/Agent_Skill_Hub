import type { Resource, ResourceType } from "@/lib/types";
import { getResourceVerification } from "@/lib/resource-verification";

type LocalizableResource = Pick<
  Resource,
  "name" | "type" | "description" | "readme_summary" | "tags" | "use_cases"
>;

type TopicRule = {
  terms: string[];
  label: string;
  purpose: string;
};

const typeLabels: Record<ResourceType, string> = {
  agent_skill: "可复用的 Agent Skill",
  mcp_server: "用于扩展 Agent 工具能力的 MCP Server",
  github_plugin: "GitHub 插件或自动化工作流",
  ui_component: "前端 UI 组件库",
  template_repo: "项目模板仓库"
};

const topicRules: TopicRule[] = [
  {
    terms: ["moneyprinterturbo", "moneyprinter", "ai-video-generator", "short-video", "text-to-video", "video-composition"],
    label: "AI 短视频脚本、素材、配音、字幕与合成",
    purpose: "用于把主题或文案转换为分镜脚本，组织图片或视频素材，生成配音和字幕，并合成可导出的竖屏短视频。"
  },
  {
    terms: ["short-video-maker", "video mcp", "background-video"],
    label: "短视频生成 MCP 与自动化接口",
    purpose: "用于让 Agent 通过 MCP 或 API 调用短视频生成流程，组合背景视频、语音、字幕和音乐并返回成片。"
  },
  {
    terms: ["openmontage", "remotion video", "video-rendering", "video-editing"],
    label: "Agent 驱动的视频制作与渲染",
    purpose: "用于编排脚本、素材、时间轴、配音和字幕，并通过 Remotion 或 FFmpeg 完成视频编辑与渲染。"
  },
  {
    terms: ["howtocook", "chinese-recipes", "chinese recipe"],
    label: "中文菜谱数据与标准化制作步骤",
    purpose: "用于提供中文菜名、食材用量、厨房准备和标准化制作步骤，可作为本地菜谱数据库的基础数据源。"
  },
  {
    terms: ["recipe-mcp", "howtocook-mcp", "recipe mcp"],
    label: "菜谱查询与菜单推荐 MCP",
    purpose: "用于让 Agent 查询菜谱、按条件组织菜单，并把食材和制作步骤作为结构化结果返回。"
  },
  {
    terms: ["personalized-nutrition", "age-aware", "dietary-restrictions", "food-allergies", "macrochef", "health conditions"],
    label: "年龄、营养目标、忌口和过敏过滤",
    purpose: "用于根据年龄、身体指标、营养目标、忌口、过敏原和饮食偏好筛选或排序菜品。"
  },
  {
    terms: ["ingredient-recommendation", "ingredient recommendation", "pantry", "portion-scaling"],
    label: "按现有食材推荐与人数份量换算",
    purpose: "用于匹配用户现有食材、计算缺少的材料，并按用餐人数换算食材份量。"
  },
  {
    terms: ["market-data", "financial-data", "real-time-quotes", "a-share", "akshare", "mootdx", "stock quote"],
    label: "股票与金融行情数据",
    purpose: "用于获取股票、指数、板块、财务和资金流等市场数据，可作为实时行情与历史数据分析的数据源。"
  },
  {
    terms: ["quantitative-trading", "quant-trading", "backtesting", "trading-strategy", "qlib", "rqalpha", "technical-analysis"],
    label: "量化研究、技术分析和策略回测",
    purpose: "用于计算技术指标、研究量化因子、构建交易策略并执行历史回测或模拟验证。"
  },
  {
    terms: ["financial-charts", "candlestick", "lightweight-charts", "k-line", "stock chart"],
    label: "K 线、分时图和金融图表",
    purpose: "用于展示 K 线、分时图、成交量和技术指标等股票行情可视化。"
  },
  {
    terms: ["image-to-3d", "image to 3d", "img2threejs", "2d-to-3d", "depth-estimation", "mesh-generation", "procedural-generation"],
    label: "二维图像转三维模型",
    purpose: "用于把二维参考图像重建为三维模型，覆盖深度或几何估计、程序化建模、质量检查与模型输出。"
  },
  {
    terms: ["three.js", "threejs", "webgl", "react-three-fiber", "model-viewer", "3d viewer"],
    label: "Three.js 与 WebGL 三维展示",
    purpose: "用于在网页中渲染、预览和交互操作三维场景或模型，可承接材质、相机、动画与模型查看功能。"
  },
  {
    terms: ["recipe", "recipes", "cooking", "food", "meal", "ingredient"],
    label: "菜谱、食材和烹饪流程",
    purpose: "用于构建菜谱、食材、份量、备菜清单和分步烹饪流程等功能。"
  },
  {
    terms: ["browser", "playwright", "selenium", "web automation"],
    label: "浏览器自动化与页面验证",
    purpose: "用于控制浏览器、执行页面操作，并验证表单、路由和端到端用户流程。"
  },
  {
    terms: ["scrape", "crawl", "firecrawl", "search", "research"],
    label: "网页采集、搜索和资料整理",
    purpose: "用于检索、采集和整理网页或研究资料，并保留可追溯的来源信息。"
  },
  {
    terms: ["github", "pull request", "issue", "code review", "github actions", "copilot"],
    label: "GitHub 仓库协作、Issue、PR 和代码评审",
    purpose: "用于 GitHub 仓库协作，覆盖 Issue、Pull Request、代码评审或 Actions 自动化。"
  },
  {
    terms: ["docs", "documentation", "context7", "api reference"],
    label: "文档检索、API 参考和开发上下文",
    purpose: "用于检索官方文档和 API 参考，为 Agent 提供可追溯的开发上下文。"
  },
  {
    terms: ["database", "postgres", "supabase", "sql", "storage"],
    label: "数据库连接、查询和数据存储",
    purpose: "用于连接数据库、执行结构化查询，并支持项目数据的持久化与检索。"
  },
  {
    terms: ["react", "next.js", "component", "design system", "tailwind", "radix", "shadcn"],
    label: "React/Next.js 界面、组件和设计系统",
    purpose: "用于搭建 React 或 Next.js 界面，复用组件、样式规范和常见交互模式。"
  },
  {
    terms: ["agent", "llm", "prompt", "mcp", "artificial intelligence"],
    label: "AI Agent、模型调用和工具工作流",
    purpose: "用于组织 AI Agent、模型调用、提示词和工具执行流程。"
  },
  {
    terms: ["template", "starter", "boilerplate", "fullstack"],
    label: "项目脚手架、页面结构和工程配置",
    purpose: "用于快速初始化项目，并复用目录结构、工程配置和基础业务实现。"
  },
  {
    terms: ["test", "testing", "lint", "quality", "audit", "continuous integration"],
    label: "自动化测试、质量检查和持续集成",
    purpose: "用于自动化测试、代码质量检查和持续集成，降低功能回归风险。"
  },
  {
    terms: ["memory", "knowledge", "rag", "embedding", "vector"],
    label: "知识管理、记忆和语义检索",
    purpose: "用于知识库、Agent 记忆、RAG 和向量语义检索等能力。"
  }
];

export function getLocalizedResourceDescription(resource: LocalizableResource) {
  const originalDescription = getChineseDescription(resource);
  if (originalDescription) return originalDescription;

  const topic = inferTopicRules(resource)[0];
  if (topic) return `${resource.name} ${topic.purpose}`;

  return `${resource.name} 是一个${typeLabels[resource.type]}。当前元数据没有提供足够具体的中文功能说明，接入前需要核对仓库 README 和实际能力边界。`;
}

export function getLocalizedUseCases(resource: LocalizableResource) {
  const topics = inferTopicRules(resource);
  const topicCase = topics[0] ? `${topics[0].label}相关功能实现` : "项目开发与能力复用";
  const typeCases: Record<ResourceType, string[]> = {
    agent_skill: ["需求拆解与开发流程规范", "代码实现、验证与交付协作"],
    mcp_server: ["连接外部工具、文档或数据源", "为 Agent 提供项目开发上下文"],
    github_plugin: ["仓库协作与自动化流程", "Issue、PR、代码评审或质量检查"],
    ui_component: ["页面布局与可复用组件", "表单、卡片、筛选器和交互体验"],
    template_repo: ["项目初始化与工程配置", "页面结构、业务示例或部署参考"]
  };

  return Array.from(new Set([topicCase, ...typeCases[resource.type]])).slice(0, 3);
}

export function getResourceEvidenceLabel(resource: Resource) {
  const verification = getResourceVerification(resource);
  return `${verification.label}：${verification.reason}`;
}

export function getLocalizedRecommendationReason(
  resource: LocalizableResource,
  score?: number,
  aiReason?: string
) {
  const specificReason = normalizeAiReason(aiReason);
  const topic = inferTopicRules(resource)[0];
  const matchStatement = typeof score === "number" && score < 40
    ? "但与当前需求的直接匹配较弱。"
    : typeof score === "number" && score < 65
      ? "与当前需求存在部分能力交集，但不应作为核心依赖。"
      : topic
        ? `当前需求直接命中其“${topic.label}”能力。`
        : "与当前需求中的相关能力标签匹配。";
  const fallbackReason = topic
    ? `${resource.name} ${topic.purpose}${matchStatement}`
    : `${resource.name} 是一个${typeLabels[resource.type]}，${matchStatement}`;
  const reason = specificReason
    ? `${specificReason.startsWith(resource.name) ? "" : `${resource.name}：`}${specificReason}`
    : fallbackReason;
  const scoreText = typeof score === "number" ? `本次方案适配度为 ${Math.round(score)}/100。` : "";

  return `${reason}${scoreText}`.replace(/。。+/g, "。");
}

function getChineseDescription(resource: LocalizableResource) {
  const candidates = [resource.description, resource.readme_summary]
    .map((value) => value?.replace(/\s+/g, " ").trim())
    .filter((value): value is string => Boolean(value));

  return candidates.find((value) => /[\u4e00-\u9fff]/.test(value) && value.length >= 12);
}

function normalizeAiReason(reason?: string) {
  if (!reason) return "";
  const normalized = reason.replace(/\s+/g, " ").trim();
  if (!/[\u4e00-\u9fff]/.test(normalized) || normalized.length < 8) return "";
  return /[。！？]$/.test(normalized) ? normalized : `${normalized}。`;
}

function inferTopicRules(resource: LocalizableResource) {
  const usefulCases = resource.use_cases.filter(
    (item) => !/github-discovered|project resource|github repository|项目资源/i.test(item)
  );
  const source = [
    resource.name,
    resource.description,
    resource.readme_summary ?? "",
    resource.tags.join(" "),
    usefulCases.join(" ")
  ].join(" ").toLowerCase();

  return topicRules.filter((rule) => rule.terms.some((term) => includesTerm(source, term)));
}

function includesTerm(source: string, term: string) {
  const normalizedSource = ` ${source.replace(/[^a-z0-9\u4e00-\u9fff]+/g, " ").replace(/\s+/g, " ").trim()} `;
  const normalizedTerm = term.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, " ").replace(/\s+/g, " ").trim();
  return normalizedTerm.length > 0 && normalizedSource.includes(` ${normalizedTerm} `);
}
