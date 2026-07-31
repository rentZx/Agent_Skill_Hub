import assert from "node:assert/strict";
import {
  buildCapabilityGraph,
  isGenericCapabilityId,
  type CapabilityPriority,
  type CapabilitySeed,
  type ResourceRole
} from "../lib/capability-engine";
import { buildProjectRecommendation } from "../lib/recommendation";
import { hasKnownProjectRule } from "../lib/project-analyzer";
import { assessRequirementClarity } from "../lib/requirement-clarity";
import { getLocalizedRecommendationReason } from "../lib/resource-localization";
import type { Resource, ResourceType } from "../lib/types";

type BenchmarkCase = {
  name: string;
  prompt: string;
  projectType: string;
  capabilities: CapabilitySeed[];
  expectedQuery: string;
  relevant: Resource[];
  irrelevant: Resource[];
};

const cases: BenchmarkCase[] = [
  {
    name: "股票行情",
    prompt: "开发一个实时获取 A 股行情并分析走势的软件",
    projectType: "股票行情分析平台",
    capabilities: [
      capability("market-data", "实时股票行情", ["market data", "real-time quotes", "a-share"]),
      capability("technical-analysis", "技术指标分析", ["technical analysis", "macd", "candlestick"])
    ],
    expectedQuery: "market data",
    relevant: [resource("AKShare", "template_repo", "A-share financial data and market data API", ["market-data", "a-share"])],
    irrelevant: [resource("Generic Agent Starter", "template_repo", "General AI agent starter template", ["ai", "template"])]
  },
  {
    name: "个性化菜谱",
    prompt: "根据食材、人数、忌口和年龄推荐菜品及制作过程",
    projectType: "个性化菜谱推荐系统",
    capabilities: [
      capability("recipe-data", "中文菜谱数据", ["chinese recipes", "ingredients", "cooking steps"]),
      capability("nutrition", "年龄与营养约束", ["personalized nutrition", "dietary restrictions", "age-aware"])
    ],
    expectedQuery: "chinese recipes",
    relevant: [resource("HowToCook", "template_repo", "Chinese recipes with ingredients and cooking steps", ["chinese-recipes", "cooking-steps"])],
    irrelevant: [resource("Generic Dashboard", "template_repo", "General purpose admin dashboard", ["dashboard", "template"])]
  },
  {
    name: "2D 转 3D",
    prompt: "把二维图片转换成可以在网页预览的三维模型",
    projectType: "图像转三维工具",
    capabilities: [
      capability("image-to-3d", "二维图像转三维", ["image to 3d", "depth estimation", "mesh generation"]),
      capability("model-viewer", "三维模型预览", ["three.js", "webgl", "model viewer"])
    ],
    expectedQuery: "image to 3d",
    relevant: [resource("img2threejs", "template_repo", "Generate a Three.js scene from an image with depth and mesh generation", ["image-to-3d", "threejs"])],
    irrelevant: [resource("AI Research Agent", "template_repo", "Autonomous general AI research workflow", ["ai", "research"])]
  },
  {
    name: "陌生领域物流优化",
    prompt: "开发配送调度系统，根据地址、车辆和时间窗规划最优路线",
    projectType: "物流配送调度系统",
    capabilities: [
      capability("route-optimization", "带时间窗的路径优化", ["vehicle routing", "route optimization", "time windows"]),
      capability("geocoding", "地址解析与地理编码", ["geocoding", "maps api", "address normalization"])
    ],
    expectedQuery: "vehicle routing",
    relevant: [resource("OR-Tools Routing", "template_repo", "Vehicle routing and route optimization with time windows", ["vehicle-routing", "optimization"])],
    irrelevant: [resource("General SaaS Boilerplate", "template_repo", "Generic SaaS starter with authentication", ["saas", "boilerplate"])]
  },
  {
    name: "超市语音库存",
    prompt: "我有一个超市，想开发货物管理系统，通过语音聊天查询物品价格、数量和所在位置",
    projectType: "语音查询型商品库存管理系统",
    capabilities: [
      capability(
        "inventory-management",
        "商品库存与库位管理",
        ["inventory management", "stock control", "warehouse location", "item pricing"],
        "core",
        ["domain_system", "domain_data"]
      ),
      capability(
        "speech-to-text",
        "中文语音识别",
        ["speech-to-text", "automatic speech recognition", "chinese asr", "streaming asr"],
        "required",
        ["speech_to_text"],
        ["ai companion", "virtual character", "voice changer"]
      )
    ],
    expectedQuery: "inventory management",
    relevant: [
      resource("InvenTree", "template_repo", "Open source inventory management with stock control and warehouse location tracking", ["inventory-management", "stock-control"]),
      resource("FunASR", "github_plugin", "Speech-to-text toolkit for Chinese ASR and streaming ASR", ["speech-to-text", "chinese-asr"])
    ],
    irrelevant: [
      resource("AIRI", "template_repo", "AI companion and virtual character with voice chat", ["ai-companion", "voice-chat"]),
      resource("Next SaaS Starter", "template_repo", "Generic SaaS starter with billing and authentication", ["saas", "boilerplate"])
    ]
  },
  {
    name: "AI 短视频生成",
    prompt: "开发一站式 AI 短视频生成工具，从主题生成文案、素材、配音、字幕并合成竖屏视频",
    projectType: "一站式 AI 短视频生成与编辑工具",
    capabilities: [
      capability(
        "short-video-pipeline",
        "AI 短视频生成流水线",
        ["short video generation", "text-to-video", "video composition", "stock footage"],
        "core",
        ["domain_system", "domain_algorithm"]
      ),
      capability(
        "video-rendering",
        "视频编辑、合成与渲染",
        ["video composition", "video rendering", "moviepy video", "remotion video"],
        "required",
        ["domain_algorithm", "developer_tool"]
      ),
      capability(
        "auto-caption",
        "自动字幕与时间轴对齐",
        ["automatic subtitles", "video captions", "caption alignment"],
        "required",
        ["speech_to_text", "domain_algorithm"]
      )
    ],
    expectedQuery: "short video generation",
    relevant: [
      resource(
        "MoneyPrinterTurbo",
        "template_repo",
        "AI short video generator with script generation, stock footage, voiceover, subtitles and video composition",
        ["ai-video-generator", "short-video", "text-to-video", "video-composition"]
      ),
      resource(
        "short-video-maker",
        "mcp_server",
        "MCP short video generator with text-to-speech, automatic subtitles and video composition",
        ["mcp-server", "short-video", "automatic-subtitles", "video-composition"]
      )
    ],
    irrelevant: [
      resource(
        "ERPNext",
        "template_repo",
        "Enterprise resource planning with inventory, procurement, accounting and asset management",
        ["erp", "inventory-management", "asset-management"]
      ),
      resource(
        "neuron-tool-creator",
        "agent_skill",
        "Generic Laravel agent framework and tool creator",
        ["laravel-agent", "agent-tool", "workflow"]
      )
    ]
  }
];

for (const benchmark of cases) {
  const graph = buildCapabilityGraph(benchmark.prompt, {
    projectType: benchmark.projectType,
    coreFeatures: benchmark.capabilities.map((item) => item.label ?? ""),
    capabilities: benchmark.capabilities
  });
  assert(
    graph.searchQueries.some((query) => query.toLowerCase().includes(benchmark.expectedQuery)),
    `${benchmark.name}: 动态查询未包含 ${benchmark.expectedQuery}`
  );

  const recommendation = buildProjectRecommendation(
    benchmark.prompt,
    [...benchmark.relevant, ...benchmark.irrelevant],
    {
      projectType: benchmark.projectType,
      coreFeatures: benchmark.capabilities.map((item) => item.label ?? ""),
      capabilityGraph: graph
    }
  );
  const recommendedNames = recommendation.groups.flatMap((group) => group.items.map((item) => item.resource.name));
  benchmark.relevant.forEach((relevant) => {
    assert(recommendedNames.includes(relevant.name), `${benchmark.name}: 未召回相关资源 ${relevant.name}`);
  });
  benchmark.irrelevant.forEach((irrelevant) => {
    assert(
      !recommendedNames.includes(irrelevant.name),
      `${benchmark.name}: 错误推荐通用资源 ${irrelevant.name}；结果=${JSON.stringify(
      recommendation.groups.map((group) => ({
        id: group.id,
        items: group.items.map((item) => ({ name: item.resource.name, why: item.why, score: item.score }))
      }))
    )}`
    );
  });

  const importantCapabilityIds = graph.capabilities
    .filter((item) => item.priority !== "optional")
    .map((item) => item.id);
  const coveredIds = new Set(
    recommendation.groups.flatMap((group) => group.items.flatMap((item) => item.matchedCapabilityIds))
  );
  assert(
    importantCapabilityIds.some((id) => coveredIds.has(id)),
    `${benchmark.name}: 推荐组合未覆盖任何核心或必需能力`
  );
}

const vagueFoodPrompt = "美食";
const vagueFoodGraph = buildCapabilityGraph(vagueFoodPrompt, {
  projectType: "美食相关产品（具体方向待确认）",
  coreFeatures: ["美食内容浏览或搜索（具体业务流程待确认）"],
  tags: ["food", "food-discovery"]
});
const vagueFoodRecommendation = buildProjectRecommendation(
  vagueFoodPrompt,
  [
    resource("HowToCook", "template_repo", "Chinese recipes with ingredients and cooking steps", ["chinese-recipes", "recipe"]),
    resource("Supabase pgvector Starter", "template_repo", "Generic vector search starter", ["pgvector", "supabase"]),
    resource("Vercel AI SDK Starter", "template_repo", "Generic AI chat starter", ["ai-sdk", "vercel"])
  ],
  {
    projectType: "美食相关产品（具体方向待确认）",
    coreFeatures: ["美食内容浏览或搜索（具体业务流程待确认）"],
    capabilityGraph: vagueFoodGraph
  }
);
const vagueFoodNames = vagueFoodRecommendation.groups.flatMap((group) =>
  group.items.map((item) => item.resource.name)
);
assert.equal(vagueFoodRecommendation.clarity.confidence, "low", "美食：应识别为低置信度主题");
assert(vagueFoodNames.includes("HowToCook"), "美食：应召回领域候选 HowToCook");
assert(!vagueFoodNames.includes("Supabase pgvector Starter"), "美食：不应因为推荐语义引入 pgvector");
assert(!vagueFoodNames.includes("Vercel AI SDK Starter"), "美食：不应默认引入 AI SDK");
assert(vagueFoodRecommendation.codexPrompt.includes("先输出需求澄清结果"), "美食：Prompt 应先澄清需求");
assert(!vagueFoodRecommendation.codexPrompt.includes("严格遵循上面的推荐技术栈"), "美食：Prompt 不应锁死推测技术栈");

const weatherGraphWithAiSeeds = buildCapabilityGraph(
  "天气记录系统，显示实时天气、未来七天预报并保存历史天气趋势",
  {
    projectType: "天气记录系统",
    coreFeatures: ["显示实时天气", "显示未来七天预报", "保存历史天气趋势"],
    capabilities: [
      capability("real-time-weather", "实时天气", ["current weather", "weather API"]),
      capability("history-trend-storage", "历史趋势存储", ["weather history", "trend analysis"]),
      capability("technical-analysis", "技术分析", ["technical analysis", "candlestick indicator"])
    ]
  }
);
const weatherCapabilityIds = new Set(weatherGraphWithAiSeeds.capabilities.map((item) => item.id));
assert(weatherCapabilityIds.has("weather-forecast-data"), "天气：规则能力 ID 不应被 AI 自定义 ID 覆盖");
assert(weatherCapabilityIds.has("historical-weather"), "天气：应保留历史天气能力");
assert(!weatherCapabilityIds.has("technical-analysis"), "天气：不应接受股票技术分析能力");

const unknownDomainGraph = buildCapabilityGraph("开发一个鸟类鸣声识别软件", {
  projectType: "鸟类鸣声识别工具",
  coreFeatures: ["上传录音并识别鸟类物种"],
  capabilities: [
    capability(
      "bird-sound-recognition",
      "鸟类鸣声识别",
      ["bird sound recognition", "bird audio classification", "bioacoustic classification"],
      "core",
      ["domain_algorithm", "domain_data"]
    )
  ]
});
const uiOnlyRecommendation = buildProjectRecommendation(
  "开发一个鸟类鸣声识别软件",
  [
    resource("shadcn/ui", "ui_component", "Generic React UI component library", ["shadcn", "ui", "components"]),
    {
      ...resource(
        "Generic Workflow Tool",
        "agent_skill",
        "Generic workflow automation for any software project",
        ["workflow", "automation"]
      ),
      source: "github_live",
      has_skill_md: true,
      matched_capabilities: ["workflow-automation"]
    }
  ],
  {
    projectType: "鸟类鸣声识别工具",
    coreFeatures: ["上传录音并识别鸟类物种"],
    capabilityGraph: unknownDomainGraph
  }
);
assert.equal(
  uiOnlyRecommendation.groups.flatMap((group) => group.items).length,
  0,
  "陌生领域：没有领域证据时不能只返回通用 UI"
);
assert(
  uiOnlyRecommendation.gaps.some((gap) => gap.includes("鸟类鸣声识别")),
  "陌生领域：领域资源不足时应明确显示核心能力缺口"
);
const inspectedLiveBirdSkill: Resource = {
  ...resource(
    "birdnet-go",
    "agent_skill",
    "Real-time avian diversity monitoring from microphone audio",
    ["bioacoustics", "birds"]
  ),
  source: "github_live",
  has_skill_md: true,
  matched_capabilities: ["bird-sound-recognition"],
  evidence_summary: "README 和 SKILL.md 已证明鸟类鸣声识别能力。"
};
const inspectedLiveRecommendation = buildProjectRecommendation(
  "开发一个鸟类鸣声识别软件",
  [inspectedLiveBirdSkill],
  {
    projectType: "鸟类鸣声识别工具",
    coreFeatures: ["上传录音并识别鸟类物种"],
    capabilityGraph: unknownDomainGraph
  }
);
assert(
  inspectedLiveRecommendation.groups.some((group) =>
    group.items.some((item) => item.resource.name === "birdnet-go")
  ),
  "陌生领域：GitHub README/SKILL.md 已验证的能力必须进入评分结果"
);

const conciseWeatherReason = getLocalizedRecommendationReason(
  resource(
    "Weather API",
    "github_plugin",
    "提供实时天气、逐小时预报和历史天气查询。",
    ["weather-api", "hourly-forecast", "historical-weather"]
  ),
  90,
  "旧模型声明类型：github_plugin；README、标签或仓库结构明确命中“天气预报数据”：weather api、weather forecast；该资源属于人工精选或领域锚点。；许可证：AGPL-3.0；已记录最近维护时间。；GitHub Stars：5946"
);
assert.equal(
  conciseWeatherReason,
  "提供实时天气、逐小时预报和历史天气查询。",
  "推荐理由不应展示内部评分证据"
);
assert(
  !/适配度|可信度|基础质量|风险依据|GitHub Stars|接入前/.test(conciseWeatherReason),
  "推荐理由不应重复徽标或风险信息"
);
assert(conciseWeatherReason.length <= 90, "推荐理由应保持简短");

const invoiceGraph = buildCapabilityGraph(
  "开发一个发票 OCR 识别和结构化提取系统",
  {
    projectType: "发票识别系统",
    tags: ["financial-data", "ocr"],
    capabilities: [
      capability(
        "technical-analysis",
        "股票技术分析",
        ["technical analysis", "financial data"],
        "core",
        ["domain_algorithm"]
      ),
      capability(
        "invoice-ocr",
        "发票 OCR",
        ["invoice ocr", "invoice data extraction"],
        "core",
        ["domain_data"]
      )
    ]
  }
);
assert(
  !invoiceGraph.capabilities.some((item) => item.id === "technical-analysis"),
  "陌生领域：financial-data 不能让发票 OCR 误入股票技术分析能力"
);
assert(
  invoiceGraph.capabilities.some((item) =>
    item.id === "invoice-ocr" || item.id === "document-processing"
  ),
  "陌生领域：应保留规范化后的发票 OCR / 文档抽取能力"
);
const libraryGraph = buildCapabilityGraph("开发图书馆系统，支持 ISBN 编目、借还书、读者、条码和 RFID");
assert(
  libraryGraph.capabilities.some((item) => item.id === "library-circulation"),
  "陌生领域：图书馆需求应生成编目、流通与读者管理能力"
);
assert(
  libraryGraph.searchQueries.some((query) => /integrated library system|library management system/i.test(query)),
  "陌生领域：图书馆需求应生成可发现 Koha、SLiMS 等项目的检索词"
);
const meetingGraph = buildCapabilityGraph("开发会议录音转写工具，区分说话人并生成摘要和行动项");
assert(
  meetingGraph.capabilities.some((item) => item.id === "speaker-diarization"),
  "陌生领域：会议需求应生成说话人分离能力"
);
assert(
  meetingGraph.capabilities.some((item) => item.id === "meeting-summarization"),
  "陌生领域：会议需求应生成会议摘要与行动项能力"
);
const visualSearchGraph = buildCapabilityGraph("开发电商以图搜图，根据商品图片查找相似商品");
assert(
  visualSearchGraph.capabilities.some((item) => item.id === "visual-product-search"),
  "陌生领域：以图搜图需求应生成视觉相似度检索能力"
);
assert(
  visualSearchGraph.searchQueries.some((query) => /visual product search|reverse image search/i.test(query)),
  "陌生领域：以图搜图需求应生成 CLIP / 向量检索方向的检索词"
);
assert(isGenericCapabilityId("audio-upload"), "陌生领域：上传能力不能独立证明领域适配");
assert(isGenericCapabilityId("audio-preprocessing"), "陌生领域：音频预处理不能独立证明领域适配");
assert(isGenericCapabilityId("model-training-pipeline"), "陌生领域：模型训练流水线不能独立证明领域适配");
assert(!isGenericCapabilityId("bird-species-classification"), "陌生领域：具体物种分类应保留为领域能力");

assert.notEqual(assessRequirementClarity("2D转3D").confidence, "low", "2D转3D：明确转换任务不应判为模糊主题");
assert.notEqual(assessRequirementClarity("炒股软件").confidence, "low", "炒股软件：明确产品类型不应判为模糊主题");
assert(
  hasKnownProjectRule("根据食材、人数、忌口和年龄推荐菜品及制作过程"),
  "个性化菜谱：食材和忌口描述应命中高置信领域规则"
);
assert(
  !hasKnownProjectRule("开发一个 AI 图片压缩工具"),
  "未知 AI 工具：不应被宽泛 AI 规则锁定为 Agent 应用"
);
const recipeCapabilityGraph = buildCapabilityGraph("根据食材、人数、忌口和年龄推荐菜品及制作过程");
assert(
  recipeCapabilityGraph.capabilities.some((item) => item.id === "recipe-data"),
  "个性化菜谱：应始终包含菜谱与制作步骤数据能力"
);
assert(
  recipeCapabilityGraph.capabilities.some((item) => item.id === "dietary-filter"),
  "个性化菜谱：应始终包含忌口和过敏过滤能力"
);
const shortVideoGraphWithNoisyAi = buildCapabilityGraph("一站式AI短视频生成工具", {
  projectType: "AI应用",
  coreFeatures: ["AI对话"],
  capabilities: [
    capability("conversational-ai", "AI 对话", ["conversational ai", "chat interface"]),
    capability("message-storage", "消息存储", ["message storage", "chat history"])
  ]
});
assert(
  shortVideoGraphWithNoisyAi.capabilities.some((item) => item.id === "short-video-pipeline"),
  "AI 短视频生成：模型误判时仍应保留本地短视频能力"
);
assert(
  !shortVideoGraphWithNoisyAi.capabilities.some((item) => ["conversational-ai", "message-storage"].includes(item.id)),
  "AI 短视频生成：不应保留模型臆造的聊天或消息能力"
);

const artStudioPrompt = "我要开发一个画室管理系统";
const artStudioGraph = buildCapabilityGraph(artStudioPrompt, {
  projectType: "教育培训管理系统",
  coreFeatures: ["课程与班级管理", "学生档案", "教师排课", "收费与订单管理"],
  capabilities: [
    capability("course-management", "课程管理", ["course management", "class scheduling"]),
    capability("portfolio-management", "作品集管理", ["student portfolio", "artwork portfolio"]),
    capability("billing-management", "收费与订单管理", ["tuition management", "fee management"])
  ]
});
const weakSchoolUi: Resource = {
  ...resource(
    "school-erp-ui-shared",
    "ui_component",
    "Shared Tailwind UI components for School ERP",
    ["school-erp", "ui", "components"]
  ),
  risk_level: "medium",
  trust_score: 58,
  fit_score: 76
};
const artStudioRecommendation = buildProjectRecommendation(
  artStudioPrompt,
  [
    resource(
      "Frappe Education",
      "template_repo",
      "Education management with students, courses, class scheduling, attendance and fee management",
      ["education-management", "course-scheduling", "student-records", "tuition-billing"]
    ),
    resource(
      "RosarioSIS",
      "template_repo",
      "Student information system with enrollment, attendance, courses and grades",
      ["education-management", "student-records", "attendance-enrollment"]
    ),
    weakSchoolUi,
    resource(
      "MoneyPrinterTurbo",
      "template_repo",
      "AI short video generation with subtitles and voiceover",
      ["short-video", "video-generation"]
    )
  ],
  {
    projectType: "教育培训管理系统",
    coreFeatures: ["课程与班级管理", "学生档案", "教师排课", "收费与订单管理"],
    capabilityGraph: artStudioGraph
  }
);
const artStudioItems = artStudioRecommendation.groups.flatMap((group) => group.items);
assert(
  !artStudioItems.some((item) => item.resource.name === "school-erp-ui-shared"),
  "画室管理：中风险且低可信的 npm UI 包不应进入默认方案"
);
assert(
  !artStudioItems.some((item) => item.alternative.includes("MoneyPrinterTurbo")),
  "画室管理：替代方案不得跨到短视频领域"
);
assert(
  !artStudioRecommendation.gaps.some((gap) => /课程管理|学生档案|教师排课|收费与订单管理/.test(gap)),
  `画室管理：已被教育模板覆盖的能力不应继续报缺口；结果=${JSON.stringify(artStudioRecommendation.gaps)}`
);

console.log(`Recommendation benchmark passed: ${cases.length} cases.`);

function capability(
  id: string,
  label: string,
  keywords: string[],
  priority: CapabilityPriority = "core",
  resourceRoles: ResourceRole[] = ["domain_system", "domain_data"],
  negativeKeywords: string[] = ["generic starter"]
): CapabilitySeed {
  return {
    id,
    label,
    description: `实现${label}`,
    required: true,
    priority,
    resourceRoles,
    keywords,
    negativeKeywords,
    preferredTypes: ["template_repo", "mcp_server", "agent_skill"]
  };
}

function resource(name: string, type: ResourceType, description: string, tags: string[]): Resource {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return {
    id: slug,
    slug,
    name,
    type,
    description,
    tags,
    supported_agents: ["Codex"],
    install_command: `Review and integrate ${name}`,
    use_cases: [description],
    risk_level: "low",
    trust_score: 80,
    fit_score: 80,
    repo_url: `https://github.com/example/${slug}`,
    source: "benchmark",
    last_updated: "2026-07-27",
    has_skill_md: type === "agent_skill",
    has_mcp_manifest: type === "mcp_server",
    has_project_manifest: type === "template_repo" || type === "github_plugin",
    has_package_json: type === "ui_component",
    matched_capabilities: type === "github_plugin" ? tags : []
  };
}
