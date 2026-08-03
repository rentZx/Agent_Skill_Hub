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

const exactResourceDescriptions: Record<string, string> = {
  img2threejs: "根据单张参考图生成可编辑的 Three.js 场景，并支持在网页中继续调整和预览。",
  triposr: "从单张图片快速重建带纹理的三维网格，适合作为图片转 3D 的模型推理底座。",
  instantmesh: "通过稀疏视角生成和网格重建，把单张图片转换为可导出的三维模型。",
  "stable-fast-3d": "从单张图片快速生成带 UV 和材质的三维资产，适合需要低延迟模型生成的流程。",
  akshare: "提供 A 股、港股、美股、基金、期货及宏观数据接口，可作为行情与财务数据源。",
  daily_stock_analysis: "集成多源行情、新闻和大模型分析，可参考其每日股票研究、看板与推送流程。",
  mootdx: "读取通达信实时行情、分钟线和本地数据，可作为 A 股盘中行情的补充数据源。",
  rqalpha: "提供量化策略回测、事件驱动交易和绩效分析，适合验证股票分析与交易策略。",
  howtocook: "提供结构化中文菜谱、食材用量和制作步骤，可整理成本地菜谱基础数据。",
  mealie: "提供菜谱导入、份量换算、餐食计划和购物清单，可参考完整的家庭菜谱管理流程。",
  "howtocook-mcp": "把 HowToCook 中文菜谱封装为 MCP 查询工具，可供 Agent 检索菜品、食材和步骤。",
  funasr: "提供中文语音识别、实时转写、语音端点检测和可组合的说话人分离流水线；会议摘要仍需另接模型。",
  "faster-whisper": "基于 CTranslate2 加速 Whisper 转写，适合离线录音识别和带时间戳的字幕生成。",
  inventree: "提供零件、库存、仓库位置、采购和库存变更管理，可作为商品库存系统参考实现。",
  erpnext: "覆盖商品、库存、仓库、采购、销售和财务流程，适合参考完整 ERP 数据模型。",
  "short-video-maker": "通过 MCP 编排背景视频、配音、字幕和音乐，并向 Agent 返回合成后的短视频。",
  moneyprinterturbo: "根据主题自动生成文案、素材、配音、字幕和竖屏视频，可作为短视频流水线底座。",
  moneyprinter: "自动组织脚本、素材、旁白和视频合成，适合参考无人工出镜短视频的生成流程。"
};

const topicRules: TopicRule[] = [
  {
    terms: ["school management", "school-management", "school erp", "student information system", "rosariosis", "frappe education"],
    label: "教育培训与教务管理",
    purpose: "用于管理课程、班级、教师、学生、考勤和收费等教育培训业务。"
  },
  {
    terms: ["speech-to-text", "speech recognition", "automatic-speech-recognition", "chinese-asr", "funasr", "faster-whisper", "whisper"],
    label: "语音识别与音频转写",
    purpose: "用于把中文或多语言语音转换为文本，支持录音转写或实时语音查询。"
  },
  {
    terms: ["inventory-management", "inventory management", "stock control", "warehouse location", "inventree", "erpnext"],
    label: "库存、商品与库位管理",
    purpose: "用于管理商品、价格、库存数量和仓库位置，并提供可查询的库存数据。"
  },
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
  const exactDescription = getExactResourceDescription(resource);
  if (exactDescription) return exactDescription;

  const originalDescription = getChineseDescription(resource);
  if (originalDescription) return conciseText(originalDescription, resource.name);

  const topic = inferTopicRules(resource)[0];
  if (topic) return conciseText(topic.purpose, resource.name);

  return `暂无具体中文说明，请查看仓库 README 确认其${typeLabels[resource.type]}能力。`;
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
  const specificReason = normalizeAiReason(aiReason, resource.name);
  const topic = inferTopicRules(resource)[0];
  if (specificReason) return conciseText(specificReason, resource.name);

  const exactDescription = getExactResourceDescription(resource);
  if (exactDescription) return exactDescription;

  const description = getChineseDescription(resource);
  if (description) return conciseText(description, resource.name);

  if (topic) {
    const boundary = typeof score === "number" && score < 65
      ? "仅适合作为辅助能力。"
      : "";
    return conciseText(`${topic.purpose}${boundary}`, resource.name);
  }

  return `可补充${typeLabels[resource.type]}能力，具体适用范围需以仓库 README 为准。`;
}

function getChineseDescription(resource: LocalizableResource) {
  const candidates = [resource.description, resource.readme_summary]
    .map((value) => value?.replace(/\s+/g, " ").trim())
    .filter((value): value is string => Boolean(value));

  return candidates.find((value) => {
    const chineseCount = value.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
    const latinCount = value.match(/[a-z]/gi)?.length ?? 0;
    return chineseCount >= 8
      && (
        /^[\u4e00-\u9fff]/.test(value)
        || chineseCount >= latinCount * 0.35
      );
  });
}

function getExactResourceDescription(resource: LocalizableResource) {
  return exactResourceDescriptions[resource.name.toLowerCase()];
}

function normalizeAiReason(reason: string | undefined, resourceName: string) {
  if (!reason) return "";
  const internalEvidencePatterns = [
    /旧模型声明类型/i,
    /README、标签或仓库结构明确命中/i,
    /人工精选或领域锚点/i,
    /许可证[：:]/i,
    /最近维护[：:]/i,
    /GitHub Stars[：:]/i,
    /可信度\s*\d+/i,
    /资源基础质量\s*\d+/i,
    /风险(?:为|等级|依据|信号)[：:\s]/i
  ];
  const normalized = reason
    .replace(/\s+/g, " ")
    .replace(new RegExp(`^${escapeRegExp(resourceName)}\\s*[：:]\\s*`, "i"), "")
    .replace(/本次方案适配度为\s*\d+\s*\/\s*100[。.]?/gi, "")
    .replace(/接入前应?[^。！？]*[。！？]?/g, "")
    .replace(/可用于当前项目的对应开发环节[，。]?/g, "")
    .trim();
  if (!/[\u4e00-\u9fff]/.test(normalized) || normalized.length < 8) return "";
  if (internalEvidencePatterns.some((pattern) => pattern.test(normalized))) return "";
  return normalized;
}

function conciseText(value: string, resourceName: string) {
  const normalized = value
    .replace(/\s+/g, " ")
    .replace(new RegExp(`^${escapeRegExp(resourceName)}\\s*(?:是一个|[：:])?\\s*`, "i"), "")
    .replace(/本次方案适配度为\s*\d+\s*\/\s*100[。.]?/gi, "")
    .replace(/接入前应?[^。！？]*[。！？]?/g, "")
    .replace(/可用于当前项目的对应开发环节[，。]?/g, "")
    .replace(/。。+/g, "。")
    .trim();
  const sentences = normalized
    .split(/(?<=[。！？])/)
    .filter(Boolean);
  const firstSentence = sentences[0] ?? "";
  const text = firstSentence.length >= 18 ? firstSentence : sentences.slice(0, 2).join("") || normalized;
  const shortened = text.length > 88 ? `${text.slice(0, 87).replace(/[，、；：\s]+$/g, "")}…` : text;
  return /[。！？…]$/.test(shortened) ? shortened : `${shortened}。`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
