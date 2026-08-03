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

const genericCapabilityIds = new Set([
  "audio-preprocessing",
  "audio-upload",
  "domain-data",
  "domain-rules",
  "feature-extraction",
  "file-upload",
  "image-upload",
  "model-training-pipeline",
  "personalized-recommendation",
  "real-time-integration",
  "result-display",
  "spectrogram-generation",
  "structured-result-display",
  "visualization",
  "web-research",
  "workflow-automation"
]);

export function isGenericCapabilityId(id: string) {
  return genericCapabilityIds.has(id)
    || /^(?:user-)?auth(?:entication|orization)?$/.test(id)
    || /^(?:role-based-access|access-control|login-system)$/.test(id);
}

/** Require direct, two-part evidence for capabilities that are easy to overmatch. */
export function isCapabilityEvidenceSufficient(capabilityId: string, source: string) {
  const text = source.toLowerCase();
  const has = (pattern: RegExp) => pattern.test(text);
  if (capabilityId === "library-circulation") {
    return has(/integrated[- ]library[- ]system|library[- ]circulation|isbn|bibliographic|patron[- ]management|cataloging.{0,40}(circulation|loan|checkout)|circulation.{0,40}(library|loan|patron)/i);
  }
  if (capabilityId === "invoice-ocr") {
    return has(/invoice|receipt|发票|收据/i)
      && has(/ocr|optical character|document extraction|structured extraction|line item|tax amount|supplier extraction|invoice parser/i);
  }
  if (capabilityId === "document-ocr-engine") return has(/ocr|optical character|document layout|table recognition|text recognition/i);
  if (capabilityId === "weather-forecast-data") {
    return has(/weather|meteorolog|forecast|天气|气象/i)
      && has(/weather api|forecast (?:api|data|service)|hourly forecast|daily forecast|current weather|meteorological data|weather model|天气接口|预报数据|实时天气/i);
  }
  if (capabilityId === "historical-weather") {
    return has(/weather|climate|meteorolog|天气|气候|气象/i)
      && has(/historical|archive|time series|past weather|历史|归档/i);
  }
  if (capabilityId === "visual-product-search") {
    return has(/product catalog|product image|e-commerce|ecommerce|商品|商用目录/i)
      && has(/visual search|image search|image retrieval|similar product|search[_ -]?by[_ -]?image|以图搜图/i)
      && !has(/osint|browser extension|google lens|tineye|stock photo downloader/i);
  }
  if (capabilityId === "multimodal-image-embeddings") {
    return has(/\bclip\b|vision.?language model|multimodal embedding model|image embedding (?:model|encoder|inference|generation|server)|encod(?:e|er|ing).{0,40}(?:image|multimodal).{0,40}embedding/i)
      && !has(/image generation only|caption only|browser extension|google lens|tineye/i);
  }
  if (capabilityId === "vector-similarity-index") return has(/^(?:qdrant|milvus|weaviate|faiss)\b|vector (?:database|query engine|search engine|index)|vector similarity search|nearest neighbor search|\bhnsw\b|embedding index/i);
  if (capabilityId === "speaker-diarization") {
    const futureOnly = has(/speaker diarization.{0,80}(?:planned|coming soon|roadmap)|(?:planned|coming soon|roadmap).{0,80}speaker diarization|speaker identification.{0,80}coming soon/i);
    const implemented = has(/speaker[- ]attributed transcripts?|speaker labels?|diariz(?:e|ation).{0,60}(?:output|transcript|pipeline|model|support)/i);
    return !futureOnly && (implemented || has(/speaker separation|speaker segmentation|who spoke/i));
  }
  if (capabilityId === "meeting-summarization") return has(/meeting|会议/i) && has(/summar|minutes|action item|meeting notes|会议纪要|行动项/i);
  if (capabilityId === "pedestrian-routing") {
    const explicitWalking = has(/pedestrian|walking|hiking|foot route|徒步|步行/i)
      && has(/routing|route planning|directions|路径|路线/i);
    const generalRoutingEngine = has(/routing engine/i)
      && has(/openstreetmap|\bosm\b|open source/i)
      && !has(/vehicle routing problem|\bvrpt?w?\b|delivery routes?|logistics optimization/i);
    return explicitWalking || generalRoutingEngine;
  }
  if (capabilityId === "interactive-map") {
    const geospatialMap = has(/openstreetmap|\bosm\b|map tiles?|geojson|maplibre|leaflet|geospatial|gis|offline (?:shelter )?maps?|route map|地图瓦片|离线地图/i);
    const svgRegionOnly = has(/svg[- ]based maps?|province selection|district selection/i)
      && !has(/openstreetmap|map tiles?|geojson|maplibre|leaflet|geospatial|gis/i);
    return geospatialMap && !svgRegionOnly;
  }
  if (capabilityId === "medical-image-segmentation") {
    return has(/medical|clinical|healthcare|dicom|ct scan|mri|radiology|pathology|医学|医疗|影像/i)
      && has(/segment(?:ation|ing)|mask generation|分割/i);
  }
  if (capabilityId === "dicom-viewer") {
    return has(/dicom|pacs|medical imaging|radiology/i)
      && has(/viewer|visualization|workstation|浏览|阅片/i);
  }
  if (capabilityId === "medical-image-labeling") {
    return has(/medical|clinical|healthcare|dicom|ct scan|mri|radiology|pathology|医学|医疗|影像/i)
      && has(/annotat(?:e|ion)|label(?:ing|led)|manual correction|segmentation editor|标注|修正/i);
  }
  if (capabilityId === "home-energy-monitoring") {
    return has(/home energy|smart meter|electricity consumption|power usage|energy monitoring|用电|智能电表/i)
      && has(/monitor|dashboard|visuali[sz]|historical|usage|consumption|监测|统计/i);
  }
  if (capabilityId === "mqtt-sensor-ingestion") {
    return has(/\bmqtt\b/i) && has(/sensor|meter|energy|electricity|power|telemetry|传感器|电表|功率/i);
  }
  if (capabilityId === "video-nvr-detection") {
    return has(/rtsp|nvr|security camera|video surveillance|camera stream|视频监控|摄像头/i)
      && has(/object detection|person detection|vehicle detection|yolo|detect and track|目标检测|人车识别/i);
  }
  if (capabilityId === "multi-object-tracking") {
    return has(/multi[- ]object tracking|object tracking|bytetrack|deep\s*sort|mot tracker|person.{0,40}tracking|vehicle.{0,40}tracking|多目标跟踪|目标跟踪/i);
  }
  if (capabilityId === "version-comparison") {
    return has(/document version comparison|compare (?:document|contract) versions?|version diff|redline|track changes|合同版本对比|文档版本对比|修订对比/i);
  }
  return true;
}

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
    id: "image-to-3d",
    label: "2D 图像转 3D 模型",
    description: "从二维图像估计几何、深度和材质，生成可预览或导出的三维模型。",
    terms: [
      "2d 转 3d", "2d转3d", "2d-to-3d", "image-to-3d", "image to 3d", "二维图片", "三维模型",
      "上传二维参考图像", "估计深度", "几何结构", "导出 glb", "导出 obj", "导出 stl"
    ],
    keywords: [
      "image-to-3d",
      "single image to 3d",
      "3d reconstruction",
      "mesh generation",
      "depth estimation",
      "three.js",
      "webgl"
    ],
    negativeKeywords: ["3d icon", "css transform", "chart only"],
    preferredTypes: ["agent_skill", "github_plugin", "template_repo", "ui_component"],
    priority: "core",
    resourceRoles: ["domain_algorithm", "developer_tool"]
  },
  {
    id: "recipe-data",
    label: "菜谱、食材与制作步骤数据",
    description: "提供可检索的菜谱、食材用量和分步制作过程，作为推荐系统的领域数据基础。",
    terms: ["菜谱", "食谱", "食材", "菜品", "制作过程", "烹饪", "做饭", "recipe", "ingredients", "cooking steps"],
    keywords: ["chinese recipes", "recipe dataset", "ingredients", "cooking steps", "step by step recipe", "recipe guide"],
    negativeKeywords: ["restaurant landing page", "food delivery ui", "generic recipe blog theme"],
    preferredTypes: ["template_repo", "mcp_server", "agent_skill"],
    priority: "core",
    resourceRoles: ["domain_data", "domain_system"]
  },
  {
    id: "ingredient-matching",
    label: "按食材匹配菜品",
    description: "根据已有食材检索可制作菜品，并说明缺少材料。",
    terms: ["根据食材", "现有食材", "食材推荐", "ingredient matching", "recipe by ingredient"],
    keywords: ["ingredient recommendation", "ingredient matching", "recipe by ingredient", "pantry recipes"],
    negativeKeywords: ["ingredient image only", "grocery storefront"],
    preferredTypes: ["template_repo", "mcp_server", "agent_skill"],
    priority: "core",
    resourceRoles: ["domain_algorithm", "domain_data"]
  },
  {
    id: "dietary-filter",
    label: "忌口、过敏与饮食限制",
    description: "按忌口、过敏原和饮食偏好过滤菜品。",
    terms: ["忌口", "过敏", "素食", "饮食限制", "dietary restriction", "allergy"],
    keywords: ["dietary restrictions", "food allergies", "allergy filter", "vegan filter", "gluten-free filter"],
    negativeKeywords: ["content moderation", "generic filter ui"],
    preferredTypes: ["template_repo", "mcp_server", "agent_skill"],
    priority: "required",
    resourceRoles: ["domain_algorithm", "domain_data"]
  },
  {
    id: "portion-scaling",
    label: "按人数换算食材份量",
    description: "根据用餐人数自动换算每种食材的用量。",
    terms: ["人数", "份量", "几人份", "servings", "portion scaling", "serving size"],
    keywords: ["portion scaling", "servings", "scale recipe", "serving size calculator"],
    negativeKeywords: ["pricing calculator", "generic calculator"],
    preferredTypes: ["template_repo", "mcp_server", "agent_skill"],
    priority: "required",
    resourceRoles: ["domain_algorithm"]
  },
  {
    id: "age-aware-nutrition",
    label: "年龄与营养约束",
    description: "根据儿童、成人或老年人的营养需求筛选和排序菜品。",
    terms: ["年龄", "儿童", "老人", "老年", "营养", "age appropriate", "elderly nutrition"],
    keywords: ["age-aware nutrition", "personalized nutrition", "child recipe", "elderly nutrition", "baby food"],
    negativeKeywords: ["age verification", "identity verification"],
    preferredTypes: ["template_repo", "mcp_server", "agent_skill"],
    priority: "required",
    resourceRoles: ["domain_algorithm", "domain_data"]
  },
  {
    id: "short-video-pipeline",
    label: "AI 短视频生成流水线",
    description: "把主题或文案转换为脚本、素材、配音、字幕和可导出的竖屏短视频。",
    terms: [
      "短视频", "视频生成", "文生视频", "文本转视频", "ai视频", "ai 视频",
      "分镜脚本", "视频素材", "视频与图片素材", "图片素材", "竖屏视频", "批量任务",
      "short video", "text-to-video", "video generation"
    ],
    keywords: ["ai short video generator", "short video generation", "text-to-video", "script generation", "stock footage", "video composition", "vertical video", "youtube shorts", "instagram reels", "tiktok video"],
    negativeKeywords: ["erp", "enterprise resource planning", "inventory management", "accounting", "procurement", "generic agent framework", "laravel agent"],
    preferredTypes: ["template_repo", "github_plugin", "agent_skill", "mcp_server"],
    priority: "core",
    resourceRoles: ["domain_system", "domain_algorithm", "project_template"]
  },
  {
    id: "video-rendering",
    label: "视频编辑、合成与渲染",
    description: "按照时间轴合成画面、配音、字幕和音乐，并编码导出目标视频格式。",
    terms: ["视频合成", "视频编辑", "视频渲染", "时间轴", "ffmpeg", "moviepy", "remotion", "video composition", "video rendering"],
    keywords: ["video composition", "video rendering", "video editing", "video encoding", "moviepy video", "remotion video", "ffmpeg video pipeline"],
    negativeKeywords: ["speech recognition only", "transcription only", "erp", "inventory management", "asset accounting"],
    preferredTypes: ["github_plugin", "template_repo", "mcp_server", "agent_skill"],
    priority: "required",
    resourceRoles: ["domain_algorithm", "developer_tool"]
  },
  {
    id: "auto-caption",
    label: "自动字幕与时间轴对齐",
    description: "从音频生成字幕，并把文本与视频时间轴对齐。",
    terms: ["字幕", "自动字幕", "caption", "subtitles", "speech-to-text"],
    keywords: ["automatic subtitles", "subtitles", "video captions", "caption alignment", "speech-to-text", "automatic speech recognition"],
    negativeKeywords: ["voice changer", "ai companion", "erp", "inventory management"],
    preferredTypes: ["github_plugin", "template_repo", "mcp_server", "agent_skill"],
    priority: "required",
    resourceRoles: ["speech_to_text", "domain_algorithm"]
  },
  {
    id: "voiceover",
    label: "智能配音与语音合成",
    description: "把脚本文本转换为可配置音色、语速和语言的旁白音频。",
    terms: ["配音", "语音合成", "旁白", "text-to-speech", "voiceover", "tts"],
    keywords: ["text-to-speech", "voiceover generation", "speech synthesis", "neural tts"],
    negativeKeywords: ["voice changer", "speech recognition only", "erp", "inventory management"],
    preferredTypes: ["github_plugin", "mcp_server", "template_repo"],
    priority: "required",
    resourceRoles: ["text_to_speech"]
  },
  {
    id: "video-template-library",
    label: "短视频模板与预设场景",
    description: "复用竖屏视频模板、场景、字幕样式和转场预设。",
    terms: ["视频模板", "模板库", "预设场景", "video template", "pre-built scene"],
    keywords: ["video templates", "short video templates", "pre-built video scenes", "vertical video templates"],
    negativeKeywords: ["saas boilerplate", "erp template", "admin dashboard", "inventory management"],
    preferredTypes: ["template_repo", "ui_component", "github_plugin"],
    priority: "required",
    resourceRoles: ["project_template", "ui_library"]
  },
  {
    id: "food-content",
    label: "美食领域内容与数据",
    description: "评估可复用的菜谱、餐食或餐厅内容数据，并在产品方向确认后选择具体数据模型。",
    terms: ["美食", "餐饮", "food discovery", "food content"],
    keywords: ["food discovery", "food content", "recipe", "meal planning", "restaurant discovery"],
    negativeKeywords: ["generic ai starter", "generic saas boilerplate"],
    preferredTypes: ["template_repo", "mcp_server", "agent_skill", "github_plugin"],
    priority: "core",
    resourceRoles: ["domain_data", "domain_system"]
  },
  {
    id: "education-management",
    label: "教育培训与教务管理",
    description: "管理校区、课程、班级、教师、学生和家长档案，并支撑教育培训机构的日常教务流程。",
    terms: ["画室", "美术培训", "教育培训", "教务", "学校管理", "school management", "education management"],
    keywords: ["school management system", "education management", "school ERP", "student information system", "training center management"],
    negativeKeywords: ["learning resources only", "course content only", "education blog", "generic dashboard"],
    preferredTypes: ["template_repo", "github_plugin", "agent_skill"],
    priority: "core",
    resourceRoles: ["domain_system"]
  },
  {
    id: "course-scheduling",
    label: "课程、班级与教师排课",
    description: "管理课程、班级、教室和教师时间，检测排课冲突并提供日历或课表视图。",
    terms: ["画室", "排课", "课程与班级", "教师排课", "课表", "course scheduling", "class scheduling", "timetabling"],
    keywords: ["course management", "course scheduling", "class scheduling", "student scheduling", "teacher scheduling", "timetabling", "class calendar"],
    negativeKeywords: ["task scheduler", "job scheduler", "social media calendar", "generic calendar only"],
    preferredTypes: ["template_repo", "github_plugin", "ui_component"],
    priority: "core",
    resourceRoles: ["domain_system", "domain_algorithm", "ui_library"]
  },
  {
    id: "student-records",
    label: "学生、家长与报名档案",
    description: "保存学生和家长信息、报名记录、班级关系与学习状态，形成可查询的学员档案。",
    terms: ["画室", "学生档案", "家长", "报名", "学员", "student records", "enrollment"],
    keywords: ["student management", "student records", "student information system", "parent portal", "enrollment management"],
    negativeKeywords: ["student project", "learning tutorial", "portfolio template only"],
    preferredTypes: ["template_repo", "github_plugin", "agent_skill"],
    priority: "required",
    resourceRoles: ["domain_system", "domain_data"]
  },
  {
    id: "attendance-enrollment",
    label: "报名、考勤与到课管理",
    description: "跟踪报名、班级名额、签到、请假、补课和到课状态，并保留可审计记录。",
    terms: ["画室", "考勤", "签到", "请假", "补课", "attendance", "enrollment"],
    keywords: ["student attendance", "attendance system", "enrollment management", "class attendance", "student tracking"],
    negativeKeywords: ["employee attendance only", "facial recognition demo only"],
    preferredTypes: ["template_repo", "github_plugin"],
    priority: "required",
    resourceRoles: ["domain_system", "domain_data"]
  },
  {
    id: "tuition-billing",
    label: "学费、缴费与欠费记录",
    description: "记录课程定价、缴费、退款、优惠和欠费状态，并将账务记录关联到学生与班级。",
    terms: ["画室", "缴费记录", "学费", "收费", "欠费", "费用管理", "tuition", "school fees"],
    keywords: ["tuition management", "school fee management", "student billing", "payment tracking", "fee collection", "费用管理", "收费管理"],
    negativeKeywords: ["generic pricing page", "crypto payment", "payment button only"],
    preferredTypes: ["template_repo", "github_plugin"],
    priority: "required",
    resourceRoles: ["domain_system", "domain_data"]
  },
  {
    id: "inventory-management",
    label: "商品库存与库位管理",
    description: "管理商品档案、价格、库存数量、仓库或货架位置，并支持实时查询。",
    terms: ["超市", "货物", "商品价格", "商品档案", "销售价格", "库存", "库位", "货架", "仓库", "inventory", "warehouse", "stock control"],
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
    terms: ["语音聊天", "语音查询", "语音输入", "语音对话", "录音转写", "会议转写", "speech-to-text", "speech recognition", "asr"],
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
    keywords: ["natural language query", "tool calling", "function calling", "structured query", "database question answering", "database mcp", "postgres mcp", "sql tool"],
    negativeKeywords: ["ai companion", "roleplay", "virtual character"],
    preferredTypes: ["agent_skill", "mcp_server", "github_plugin", "template_repo"],
    priority: "required",
    resourceRoles: ["agent_tool", "mcp_integration"]
  },
  {
    id: "stock-market-data",
    label: "股票市场与实时行情数据",
    description: "获取股票、指数、板块、分钟线、K 线、财务和资金流等市场数据。",
    terms: ["炒股", "股票", "股市", "证券行情", "A股", "stock market", "market data", "real-time quotes"],
    keywords: ["stock market data", "stock data quotes", "a-share", "real-time quotes", "financial data"],
    negativeKeywords: ["inventory stock", "stock footage", "warehouse stock"],
    preferredTypes: ["github_plugin", "mcp_server", "template_repo", "agent_skill"],
    priority: "core",
    resourceRoles: ["domain_data", "mcp_integration"]
  },
  {
    id: "technical-analysis",
    label: "股票走势与技术分析",
    description: "计算 K 线、均线、MACD、RSI、布林带等指标，并支持因子研究、回测或走势分析。",
    terms: ["走势分析", "技术分析", "K线", "均线", "MACD", "RSI", "量化", "technical analysis", "backtesting"],
    keywords: ["technical analysis", "candlestick indicator", "macd rsi", "quantitative backtesting"],
    negativeKeywords: ["generic chart only", "inventory analytics"],
    preferredTypes: ["github_plugin", "template_repo", "agent_skill"],
    priority: "core",
    resourceRoles: ["domain_algorithm", "domain_system"]
  },
  {
    id: "plant-species-identification",
    label: "植物拍照与物种识别",
    description: "接收相机或相册中的植物照片，返回候选物种、学名、常用名、置信度和可追溯的识别依据。",
    terms: [
      "植物识别", "识别植物", "拍照识花", "拍照识植物", "花草识别", "植物种类",
      "plant identification", "plant identifier", "plant species recognition", "species classification"
    ],
    keywords: [
      "plant identification", "plant species recognition", "plant image classification",
      "species classification", "plantnet api", "ai taxonomist"
    ],
    negativeKeywords: [
      "plant disease only", "leaf disease only", "crop disease only",
      "plant management only", "gardening tracker only"
    ],
    preferredTypes: ["github_plugin", "ui_component", "template_repo", "agent_skill", "mcp_server"],
    priority: "core",
    resourceRoles: ["domain_algorithm", "domain_data"]
  },
  {
    id: "plant-identification-api",
    label: "植物识别服务接入",
    description: "通过服务端代理安全调用植物识别 API，上传图片并规范化物种候选、置信度和错误结果。",
    terms: [
      "植物识别", "识别植物", "拍照识花", "拍照识植物",
      "plant identification", "plant identifier", "plantnet"
    ],
    keywords: [
      "plant identification api", "plantnet api", "plant image api",
      "species identification api", "ai taxonomist"
    ],
    negativeKeywords: ["plant disease api only", "static plant database only"],
    preferredTypes: ["github_plugin", "ui_component", "mcp_server", "template_repo"],
    priority: "required",
    resourceRoles: ["domain_data", "mcp_integration", "domain_algorithm"]
  },
  {
    id: "plant-species-dataset",
    label: "植物物种图像与分类数据",
    description: "准备带物种标签的植物图像数据，用于模型训练、离线评估和识别质量基准。",
    terms: [
      "植物识别", "植物种类", "物种分类", "训练植物识别",
      "plant identification", "plant species recognition", "species classification"
    ],
    keywords: [
      "plant image dataset", "plant species dataset", "plantnet-300k",
      "plant classification dataset", "botanical image dataset"
    ],
    negativeKeywords: ["plant disease dataset", "leaf disease dataset", "crop disease dataset"],
    preferredTypes: ["github_plugin", "template_repo"],
    priority: "required",
    resourceRoles: ["domain_data"]
  },
  {
    id: "plant-disease-detection",
    label: "植物病害与叶片健康识别",
    description: "在需求明确包含病害、病斑或叶片健康时，识别植物疾病并返回类别和置信度。",
    terms: [
      "植物病害", "病害识别", "作物病害", "叶片病害", "病虫害识别", "叶片疾病", "病斑识别", "植物健康诊断",
      "plant disease", "leaf disease", "crop disease", "plant pathology"
    ],
    keywords: [
      "plant disease detection", "leaf disease classification",
      "crop disease recognition", "plant pathology image"
    ],
    negativeKeywords: ["species identification only", "plant taxonomy only"],
    preferredTypes: ["github_plugin", "template_repo", "agent_skill"],
    priority: "core",
    resourceRoles: ["domain_algorithm", "domain_data"]
  },
  {
    id: "weather-forecast-data",
    label: "实时天气与预报数据",
    description: "获取当前位置或指定城市的实时天气、小时预报、逐日预报和气象变量。",
    terms: ["天气", "天气预报", "气象", "weather", "forecast"],
    keywords: ["weather api", "weather forecast", "current weather", "hourly forecast", "daily forecast"],
    negativeKeywords: ["weather icon only", "weather ui only", "static weather widget"],
    preferredTypes: ["github_plugin", "mcp_server", "template_repo", "agent_skill"],
    priority: "core",
    resourceRoles: ["domain_data", "mcp_integration"]
  },
  {
    id: "historical-weather",
    label: "历史天气与趋势",
    description: "查询历史气温、降水、风速等时间序列，为趋势比较和记录分析提供数据。",
    terms: ["历史天气", "天气历史", "气象趋势", "historical weather", "weather history"],
    keywords: ["historical weather", "weather archive", "climate data", "weather history"],
    negativeKeywords: ["weather icon only", "forecast only"],
    preferredTypes: ["github_plugin", "mcp_server", "template_repo"],
    priority: "required",
    resourceRoles: ["domain_data"]
  },
  {
    id: "food-diary",
    label: "饮食与热量记录",
    description: "按日期和餐次记录食物、份量、热量及营养摄入，支持历史查询和目标跟踪。",
    terms: ["饮食记录", "饮食日志", "热量记录", "卡路里记录", "food diary", "nutrition tracker", "calorie tracker"],
    keywords: ["food diary", "meal logging", "nutrition tracker", "calorie tracker", "diet tracking"],
    negativeKeywords: ["recipe blog only", "restaurant discovery", "food delivery"],
    preferredTypes: ["template_repo", "github_plugin", "agent_skill"],
    priority: "core",
    resourceRoles: ["domain_system", "domain_data"]
  },
  {
    id: "nutrition-database",
    label: "食品营养数据库",
    description: "按食品、品牌或条码查询热量、营养成分和过敏原，作为饮食记录的数据底座。",
    terms: ["营养数据库", "食品营养", "营养成分", "过敏原", "nutrition database", "food database"],
    keywords: ["food database nutrition", "nutrition database", "open food facts", "food products allergens"],
    negativeKeywords: ["recipe styling", "restaurant menu ui"],
    preferredTypes: ["github_plugin", "mcp_server", "template_repo"],
    priority: "required",
    resourceRoles: ["domain_data"]
  },
  {
    id: "barcode-food-lookup",
    label: "食品条码扫描与查询",
    description: "扫描商品条码并查询食品、营养和过敏原信息，减少手工录入。",
    terms: ["食品条码", "条码扫描", "扫码记录饮食", "food barcode", "barcode nutrition"],
    keywords: ["barcode food lookup", "barcode nutrition", "open food facts barcode", "food scanner"],
    negativeKeywords: ["generic barcode generator", "qr code only"],
    preferredTypes: ["github_plugin", "template_repo", "mcp_server"],
    priority: "required",
    resourceRoles: ["domain_data", "domain_system"]
  },
  {
    id: "workout-planning",
    label: "训练计划与动作编排",
    description: "创建训练动作、组次、重量、训练日和渐进式计划。",
    terms: ["健身计划", "训练计划", "动作编排", "workout planning", "training plan"],
    keywords: ["workout planning", "workout routines", "training plan exercise", "workout plan"],
    negativeKeywords: ["fitness landing page", "gym website template only"],
    preferredTypes: ["template_repo", "agent_skill", "github_plugin"],
    priority: "core",
    resourceRoles: ["domain_system", "domain_algorithm"]
  },
  {
    id: "workout-tracking",
    label: "训练与运动记录",
    description: "记录力量训练、运动活动、组次、重量、距离、轨迹和完成状态。",
    terms: ["健身记录", "训练记录", "运动记录", "workout tracker", "fitness tracker", "activity tracker"],
    keywords: ["workout tracker", "fitness tracker", "activity tracker", "exercise log", "track workouts"],
    negativeKeywords: ["fitness landing page", "wearable marketing"],
    preferredTypes: ["template_repo", "github_plugin", "agent_skill"],
    priority: "core",
    resourceRoles: ["domain_system", "domain_data"]
  },
  {
    id: "body-measurements",
    label: "体重与身体指标跟踪",
    description: "跟踪体重、围度、身体测量和训练进度变化。",
    terms: ["体重记录", "身体指标", "围度", "body measurements", "weight tracker"],
    keywords: ["body measurements", "body weight tracker", "fitness progress", "weight tracking"],
    negativeKeywords: ["weight loss landing page"],
    preferredTypes: ["template_repo", "github_plugin"],
    priority: "required",
    resourceRoles: ["domain_data", "domain_system"]
  },
  {
    id: "library-circulation",
    label: "图书编目、借阅与读者管理",
    description: "围绕 ISBN 和书目记录管理馆藏、借还、预约、读者、逾期与罚款。",
    terms: [
      "图书馆", "图书管理", "isbn", "借书", "还书", "借阅", "读者管理",
      "library system", "library management", "circulation", "patron management"
    ],
    keywords: [
      "integrated library system", "library management system", "library circulation",
      "isbn cataloging", "patron management", "bibliographic records"
    ],
    negativeKeywords: ["warehouse inventory", "manufacturing inventory", "parts inventory"],
    preferredTypes: ["template_repo", "github_plugin", "mcp_server"],
    priority: "core",
    resourceRoles: ["domain_system", "domain_data"]
  },
  {
    id: "speaker-diarization",
    label: "会议转写与说话人分离",
    description: "把会议录音转写为带时间戳的文本，并区分不同说话人。",
    terms: [
      "会议转写", "会议录音", "说话人分离", "说话人识别",
      "meeting transcription", "speaker diarization", "speaker separation"
    ],
    keywords: [
      "meeting transcription", "speaker diarization", "speaker segmentation",
      "word level timestamps", "multi speaker transcription"
    ],
    negativeKeywords: ["text to speech", "voice changer", "music generation"],
    preferredTypes: ["github_plugin", "template_repo", "agent_skill"],
    priority: "core",
    resourceRoles: ["speech_to_text", "domain_algorithm"]
  },
  {
    id: "meeting-summarization",
    label: "会议摘要与行动项提取",
    description: "从会议转写中生成摘要、决策记录、待办事项和责任人。",
    terms: ["会议摘要", "会议纪要", "行动项", "待办事项", "meeting summary", "action items"],
    keywords: ["meeting summarization", "meeting minutes", "action item extraction", "meeting notes"],
    negativeKeywords: ["generic text summarizer only"],
    preferredTypes: ["agent_skill", "github_plugin", "template_repo"],
    priority: "required",
    resourceRoles: ["domain_algorithm", "agent_tool"]
  },
  {
    id: "invoice-ocr",
    label: "发票 OCR 与字段抽取",
    description: "识别发票、收据或费用凭证，并抽取供应商、日期、金额、税额和明细。",
    terms: ["发票", "票据", "收据", "费用审核", "invoice ocr", "receipt ocr", "invoice extraction"],
    keywords: [
      "invoice ocr", "invoice data extraction", "receipt data extraction",
      "invoice parser", "invoice line item extraction"
    ],
    negativeKeywords: ["stock market", "technical analysis", "trading", "school billing"],
    preferredTypes: ["github_plugin", "template_repo", "agent_skill"],
    priority: "core",
    resourceRoles: ["domain_data", "domain_algorithm"]
  },
  {
    id: "document-ocr-engine",
    label: "文档 OCR 引擎",
    description: "对图片和 PDF 执行文字识别、版面分析、表格识别与结构化输出。",
    terms: ["发票", "票据", "收据", "ocr", "invoice ocr", "receipt ocr", "document ocr"],
    keywords: [
      "ocr toolkit", "multilingual ocr", "document layout analysis",
      "table recognition", "structured document extraction"
    ],
    negativeKeywords: ["invoice demo only", "browser extension"],
    preferredTypes: ["github_plugin", "template_repo"],
    priority: "required",
    resourceRoles: ["domain_algorithm", "developer_tool"]
  },
  {
    id: "visual-product-search",
    label: "商品图片相似度检索",
    description: "把商品图片编码为向量，并按视觉相似度检索目录中的商品。",
    terms: [
      "以图搜图", "图片搜索商品", "相似图片", "视觉搜索", "商品图片检索",
      "visual product search", "reverse image search", "image similarity search"
    ],
    keywords: ["visual product search", "product image retrieval", "similar product search"],
    negativeKeywords: [
      "text search only", "image gallery only", "stock photo downloader",
      "osint", "search engines", "browser extension", "google lens", "tineye"
    ],
    preferredTypes: ["github_plugin", "template_repo", "mcp_server"],
    priority: "core",
    resourceRoles: ["domain_algorithm", "domain_data"]
  },
  {
    id: "multimodal-image-embeddings",
    label: "商品图片向量化",
    description: "使用视觉或多模态模型把商品图片编码为可比较的特征向量。",
    terms: [
      "以图搜图", "图片搜索商品", "相似图片", "视觉搜索", "商品图片检索",
      "visual product search", "reverse image search", "image similarity search"
    ],
    keywords: [
      "contrastive language image pretraining", "vision language model",
      "image text embeddings", "openai clip"
    ],
    negativeKeywords: [
      "image generation only", "image caption only", "browser extension",
      "search engines", "google lens", "tineye", "osint"
    ],
    preferredTypes: ["github_plugin", "template_repo"],
    priority: "required",
    resourceRoles: ["domain_algorithm"]
  },
  {
    id: "vector-similarity-index",
    label: "图片向量索引与近邻检索",
    description: "保存商品图片向量，并执行高性能相似度搜索、过滤和召回。",
    terms: [
      "以图搜图", "图片搜索商品", "相似图片", "视觉搜索", "商品图片检索",
      "visual product search", "reverse image search", "image similarity search"
    ],
    keywords: [
      "vector similarity search", "vector database", "nearest neighbor search",
      "qdrant vector search", "milvus vector database"
    ],
    negativeKeywords: ["text search engine only", "image gallery"],
    preferredTypes: ["github_plugin", "template_repo", "mcp_server"],
    priority: "required",
    resourceRoles: ["domain_data", "domain_algorithm"]
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
    .filter((capability): capability is CapabilityRequirement => Boolean(capability))
    .filter((capability) => isSeededCapabilityCompatible(capability, input.toLowerCase()));

  const patterned = capabilityPatterns
    .filter((pattern) => pattern.terms.some((term) => source.includes(term.toLowerCase())) || matchesDeterministicIntent(pattern.id, input))
    .map((pattern) => ({
      ...pattern,
      required: pattern.priority !== "optional",
      negativeKeywords: pattern.negativeKeywords ?? []
    }))
    .filter((capability) => isSeededCapabilityCompatible(capability, input.toLowerCase()));

  const featureCapabilities = (details.coreFeatures ?? [])
    .filter((feature) => !isGenericFeatureCapability(feature))
    .filter((feature) => !patterned.some((pattern) =>
      pattern.terms.some((term) => {
        const normalizedFeature = normalizeTerm(feature);
        const normalizedPatternTerm = normalizeTerm(term);
        return normalizedPatternTerm.length >= 2
          && (
            normalizedFeature.includes(normalizedPatternTerm)
            || normalizedPatternTerm.includes(normalizedFeature)
          );
      })
    ))
    .map((feature, index) => capabilityFromFeature(feature, index))
    .filter((capability) => isSeededCapabilityCompatible(capability, input.toLowerCase()))
    .filter((capability) => ![...seeded, ...patterned].some((existing) => capabilitiesOverlap(existing, capability)));

  const capabilities = filterCapabilitiesForDomain(
    removeCompositeCapabilities(
      dedupeCapabilities([...patterned, ...seeded, ...featureCapabilities])
    ),
    input
  ).slice(0, 10);
  const searchQueries = buildSearchQueries(capabilities, details.searchQueries ?? []);

  return {
    domain: details.projectType?.trim() || inferDomain(input),
    capabilities,
    constraints: cleanStrings(details.constraints ?? [], 10),
    searchQueries
  };
}

function matchesDeterministicIntent(capabilityId: string, input: string) {
  const source = input.toLowerCase();
  if (capabilityId === "library-circulation") {
    return /\u56fe\u4e66\u9986/.test(source)
      && /isbn|\u7f16\u76ee|\u501f\u8fd8|\u501f\u9605|\u8bfb\u8005|\u6761\u7801|rfid/.test(source);
  }
  if (capabilityId === "speaker-diarization") {
    return /\u4f1a\u8bae/.test(source)
      && /\u5f55\u97f3|\u8f6c\u5199|\u8bf4\u8bdd\u4eba|\u5206\u8fa8/.test(source);
  }
  if (capabilityId === "meeting-summarization") {
    return /\u4f1a\u8bae/.test(source)
      && /\u6458\u8981|\u7eaa\u8981|\u884c\u52a8\u9879|\u5f55\u97f3|\u8f6c\u5199/.test(source);
  }
  if (capabilityId === "invoice-ocr") {
    return /\u53d1\u7968|\u6536\u636e|\u8d39\u7528\u5ba1\u6838/.test(source)
      && /ocr|\u8bc6\u522b|\u62bd\u53d6|\u7a0e\u989d|\u91d1\u989d|\u660e\u7ec6/.test(source);
  }
  if (capabilityId === "document-ocr-engine") {
    return /ocr|\u53d1\u7968|\u6536\u636e|\u6587\u6863\u8bc6\u522b/.test(source);
  }
  if (capabilityId === "visual-product-search") {
    return /\u4ee5\u56fe\u641c\u56fe|\u5546\u54c1\u56fe\u7247|\u76f8\u4f3c\u5546\u54c1|\u89c6\u89c9\u641c\u7d22/.test(source);
  }
  if (capabilityId === "multimodal-image-embeddings" || capabilityId === "vector-similarity-index") {
    return /\u4ee5\u56fe\u641c\u56fe|\u5546\u54c1\u56fe\u7247|\u76f8\u4f3c\u5546\u54c1|\u89c6\u89c9\u641c\u7d22/.test(source);
  }
  return false;
}

function isSeededCapabilityCompatible(capability: CapabilityRequirement, source: string) {
  const capabilitySource = `${capability.id} ${capability.label} ${capability.keywords.join(" ")}`.toLowerCase();
  if (
    /(ingredient.recognition|food recognition|食材识别)/i.test(capabilitySource)
    && !/(拍照|图片|图像|相机|摄像头|识别食材|ingredient recognition|food recognition|camera|image)/i.test(source)
  ) {
    return false;
  }
  const domainChecks = [
    {
      capability: /(stock.market|technical.analysis|candlestick|macd|quantitative.backtesting)/,
      intent: /(炒股|股票|股市|证券行情|a\s*股|stock.market|stock.trading|market.data|quantitative.trading)/
    },
    {
      capability: /(inventory.management|stock.control|warehouse.location|item.pricing)/,
      intent: /(超市|货物|商品价格|商品库存|库存|库位|货架|仓库|inventory.management|stock.control|warehouse.location)/
    },
    {
      capability: /(weather.forecast|historical.weather|current.weather|climate.data)/,
      intent: /(天气|天气预报|气象|weather|forecast|climate)/
    },
    {
      capability: /(food.diary|nutrition.database|calorie.tracker|barcode.food)/,
      intent: /(饮食|营养|热量|卡路里|食品|food|nutrition|calorie)/
    },
    {
      capability: /(workout|fitness.tracker|exercise.log|body.measurements)/,
      intent: /(健身|训练|运动记录|体重|workout|fitness|exercise)/
    },
    {
      capability: /(plant.disease|leaf.disease|crop.disease|plant.pathology)/,
      intent: /(植物病害|病害识别|作物病害|叶片病害|病虫害|叶片疾病|病斑|植物健康|plant.disease|leaf.disease|crop.disease|plant.pathology)/
    }
  ];

  return !domainChecks.some((check) =>
    check.capability.test(capabilitySource) && !check.intent.test(source)
  );
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
  const capabilitySource = `${label} ${keywords.join(" ")}`.toLowerCase();
  const hasDomainRole = inferredRoles.some((role) =>
    role === "domain_system" || role === "domain_data" || role === "domain_algorithm"
  );
  if (priority === "core" && !hasDomainRole) priority = "required";
  if (/(自然语言.*查询|natural language query|tool calling|function calling)/.test(capabilitySource)) {
    priority = "required";
  }
  if (inferredRoles.includes("text_to_speech")) priority = "optional";

  return normalizeKnownCapabilityAlias({
    id: slugify(seed.id || label),
    label,
    description: seed.description?.trim() || `实现${label}并验证其能力边界。`,
    required: priority !== "optional",
    priority,
    resourceRoles: inferredRoles,
    keywords,
    negativeKeywords: cleanStrings(seed.negativeKeywords ?? [], 8),
    preferredTypes: preferredTypes.length > 0 ? preferredTypes : ["agent_skill", "mcp_server", "template_repo"]
  });
}

function normalizeKnownCapabilityAlias(capability: CapabilityRequirement) {
  const source = `${capability.id} ${capability.label} ${capability.keywords.join(" ")}`.toLowerCase();
  const aliases: Array<[RegExp, string]> = [
    [/(attendance tracking|attendance sheet|absence management|check-in|考勤|签到|缺勤)/i, "attendance-enrollment"],
    [/(tuition|school fee|student billing|billing|invoice|payment records|fee collection|学费|缴费|收费|财务管理)/i, "tuition-billing"],
    [/(dietary|allerg|忌口|过敏)/i, "dietary-filter"],
    [/(course management|course scheduling|class scheduling|teacher scheduling|timetable|排课|课表)/i, "course-scheduling"],
    [/(student records|student information|parent portal|enrollment management|学生档案|报名档案)/i, "student-records"]
  ];
  const aliasId = aliases.find(([pattern]) => pattern.test(source))?.[1];
  if (!aliasId || aliasId === capability.id) return capability;

  const pattern = capabilityPatterns.find((candidate) => candidate.id === aliasId);
  if (!pattern) return { ...capability, id: aliasId };
  const priority = priorityWeight(capability.priority) > priorityWeight(pattern.priority)
    ? capability.priority
    : pattern.priority;

  return {
    ...capability,
    id: pattern.id,
    label: pattern.label,
    description: pattern.description,
    required: priority !== "optional",
    priority,
    resourceRoles: Array.from(new Set([...pattern.resourceRoles, ...capability.resourceRoles])),
    keywords: cleanStrings([...pattern.keywords, ...capability.keywords], 12),
    negativeKeywords: cleanStrings([...(pattern.negativeKeywords ?? []), ...capability.negativeKeywords], 8),
    preferredTypes: Array.from(new Set([...pattern.preferredTypes, ...capability.preferredTypes]))
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

function isGenericFeatureCapability(feature: string) {
  const normalized = normalizeTerm(feature);
  return [
    "用户输入",
    "业务数据管理",
    "搜索与筛选",
    "后台管理",
    "结果导出",
    "返回有数据依据的查询结果"
  ].some((term) => normalized === normalizeTerm(term));
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
  return right.keywords.some((keyword) => {
    const normalized = normalizeTerm(keyword);
    if (leftTerms.has(normalized)) return true;
    return Array.from(leftTerms).some((leftTerm) =>
      Math.min(leftTerm.length, normalized.length) >= 8
      && (leftTerm.includes(normalized) || normalized.includes(leftTerm))
    );
  });
}

function dedupeCapabilities(capabilities: CapabilityRequirement[]) {
  const unique: CapabilityRequirement[] = [];
  capabilities.forEach((capability) => {
    const index = unique.findIndex((existing) =>
      existing.id === capability.id || capabilitiesOverlap(existing, capability)
    );
    if (index < 0) {
      unique.push(capability);
      return;
    }

    const existing = unique[index];
    const priority = priorityWeight(capability.priority) > priorityWeight(existing.priority)
      ? capability.priority
      : existing.priority;
    unique[index] = {
      ...existing,
      required: priority !== "optional",
      priority,
      resourceRoles: Array.from(new Set([...existing.resourceRoles, ...capability.resourceRoles])),
      keywords: cleanStrings([...existing.keywords, ...capability.keywords], 12),
      negativeKeywords: cleanStrings([...existing.negativeKeywords, ...capability.negativeKeywords], 8),
      preferredTypes: Array.from(new Set([...existing.preferredTypes, ...capability.preferredTypes]))
    };
  });
  return unique;
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

function filterCapabilitiesForDomain(capabilities: CapabilityRequirement[], input: string) {
  if (!/(短视频|视频生成|文生视频|文本转视频|视频合成|ai.?视频|ai.?video|short.?video|text.to.video|video.generation)/i.test(input)) {
    return capabilities;
  }

  return capabilities.filter((capability) => {
    const source = `${capability.id} ${capability.label} ${capability.keywords.join(" ")}`.toLowerCase();
    return !/(conversational|chat|message.storage|real.time.communication|user.authentication|natural.language.query|tool.calling|function.calling)/i.test(source);
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
