export type ResourceCapabilityDefinition = {
  id: string;
  label: string;
  description: string;
  domain: string;
  role:
    | "domain_system"
    | "domain_data"
    | "domain_algorithm"
    | "speech_to_text"
    | "text_to_speech"
    | "ui_library"
    | "project_template"
    | "developer_tool";
  patterns: string[][];
  negativePatterns?: string[];
};

export type ResourceCapabilityMatch = {
  capabilityId: string;
  confidence: number;
  coverageLevel: "full" | "partial" | "supporting";
  matchedTerms: string[];
  summary: string;
};

export const resourceCapabilityDefinitions: ResourceCapabilityDefinition[] = [
  capability("image-to-3d", "图像转三维模型", "从二维图像生成三维几何、网格或可导出模型。", "3d", "domain_algorithm", [
    ["image to 3d"], ["image-to-3d"], ["single image", "3d model"], ["3d reconstruction", "mesh"]
  ]),
  capability("stock-market-data", "股票市场数据", "提供股票、指数、板块、分钟线或实时报价数据。", "finance", "domain_data", [
    ["stock market", "market data"], ["stock data", "quotes"], ["a-share"], ["股票", "行情"]
  ], ["inventory stock", "stock footage"]),
  capability("technical-analysis", "行情技术分析", "提供 K 线、技术指标、因子研究或走势分析。", "finance", "domain_algorithm", [
    ["technical analysis"], ["candlestick", "indicator"], ["macd", "rsi"], ["quantitative", "backtesting"]
  ]),
  capability("recipe-data", "菜谱与食材数据", "提供菜谱、食材、份量和制作步骤数据。", "food", "domain_data", [
    ["recipe", "ingredients"], ["cooking steps"], ["meal planning", "recipe"], ["菜谱", "食材"]
  ], ["restaurant landing page"]),
  capability("ingredient-matching", "按食材匹配菜品", "根据已有食材查找或生成可制作菜品。", "food", "domain_algorithm", [
    ["recipe by ingredient"], ["ingredient matching"], ["ingredient recommendation"], ["pantry", "recipe"]
  ]),
  capability("inventory-management", "库存与库位管理", "管理商品、价格、库存、仓库和货架位置。", "inventory", "domain_system", [
    ["inventory management"], ["stock control", "warehouse"], ["warehouse location"], ["product catalog", "item pricing"]
  ], ["stock market", "stock footage"]),
  capability("speech-to-text", "语音识别", "把语音转换为文本或结构化输入。", "speech", "speech_to_text", [
    ["speech to text"], ["speech-to-text"], ["automatic speech recognition"], ["voice transcription"], ["chinese asr"]
  ], ["voice changer", "ai companion"]),
  capability("short-video-pipeline", "AI 短视频生成", "从主题或文案生成素材、配音、字幕并合成短视频。", "video", "domain_system", [
    ["short video", "generation"], ["text to video"], ["text-to-video"], ["video generation", "subtitles"]
  ], ["video player only"]),
  capability("video-rendering", "视频编辑与渲染", "编辑、合成、编码或渲染视频。", "video", "domain_algorithm", [
    ["video rendering"], ["video composition"], ["video editing"], ["ffmpeg", "video"]
  ]),
  capability("auto-caption", "自动字幕", "从音频生成字幕并对齐视频时间轴。", "video", "domain_algorithm", [
    ["automatic subtitles"], ["automatic captions"], ["video captions"], ["caption alignment"],
    ["subtitle generation"], ["timed captions"], ["subtitles", "video"], ["captions", "video"],
    ["captions", "ffmpeg"]
  ]),
  capability("education-management", "教育培训管理", "管理学校或培训机构的学生、教师、课程和教务流程。", "education", "domain_system", [
    ["school management"], ["education management"], ["school erp"], ["student information system"]
  ], ["learning resources only"]),
  capability("course-scheduling", "课程与教师排课", "安排课程、教师、学生、教室和考试时间。", "education", "domain_algorithm", [
    ["course scheduling"], ["class scheduling"], ["student scheduling"], ["teacher scheduling"], ["timetabling"]
  ], ["task scheduler", "job scheduler"]),
  capability("student-records", "学生与报名档案", "管理学生、家长、报名和班级关系。", "education", "domain_data", [
    ["student management"], ["student records"], ["parent portal"], ["enrollment management"]
  ]),
  capability("weather-forecast-data", "天气预报数据", "提供实时天气、小时预报、逐日预报和气象变量。", "weather", "domain_data", [
    ["weather api"], ["weather forecast"], ["hourly forecast"], ["current weather", "forecast"]
  ]),
  capability("historical-weather", "历史天气数据", "提供历史气温、降水、风速等时间序列数据。", "weather", "domain_data", [
    ["historical weather"], ["weather history"], ["climate data", "historical"], ["weather archive"]
  ]),
  capability("food-diary", "饮食日志", "按日期和餐次记录食物、饮食、热量与营养摄入。", "nutrition", "domain_system", [
    ["food diary"], ["meal logging"], ["nutrition tracker"], ["calorie tracker"], ["calories tracker"]
  ]),
  capability("nutrition-database", "食品营养数据库", "查询食品、热量、宏量营养、微量营养和过敏原信息。", "nutrition", "domain_data", [
    ["food database", "nutrition"], ["open food facts"], ["nutrition database"], ["food products", "allergens"]
  ]),
  capability("barcode-food-lookup", "食品条码查询", "通过条码扫描或商品编码查询食品与营养信息。", "nutrition", "domain_data", [
    ["barcode scanner", "food"], ["barcode", "nutrition"], ["scan", "open food facts"]
  ]),
  capability("workout-planning", "训练计划", "创建训练动作、组次、重量和进阶计划。", "fitness", "domain_system", [
    ["workout routines"], ["workout planning"], ["training plan", "exercise"], ["workout plan"]
  ]),
  capability("workout-tracking", "训练与活动记录", "记录训练、运动活动、组次、重量、距离或轨迹。", "fitness", "domain_system", [
    ["workout tracker"], ["fitness tracker"], ["activity tracker"], ["track workouts"], ["exercise log"]
  ]),
  capability("body-measurements", "体重与身体指标", "跟踪体重、围度、身体测量和进度变化。", "fitness", "domain_data", [
    ["body weight", "measurements"], ["weight tracker"], ["body measurements"], ["fitness progress"]
  ]),
  capability("plant-species-identification", "植物物种识别", "根据植物照片识别候选物种，并返回学名、常用名和置信度。", "plant", "domain_algorithm", [
    ["plant identification"], ["plants identification"], ["plant species", "recognition"], ["plant species", "classification"],
    ["ai taxonomist"], ["plantnet", "identify"]
  ], ["plant disease only", "leaf disease only", "crop disease only"]),
  capability("plant-identification-api", "植物识别 API", "通过可调用 API 上传植物照片并获取物种识别候选结果。", "plant", "domain_data", [
    ["plant identification", "api"], ["plantnet api"], ["plant identification", "webcomponent"],
    ["ai taxonomist", "api"]
  ], ["plant disease api only"]),
  capability("plant-species-dataset", "植物物种图像数据集", "提供带物种标签的植物图像，用于训练、评估或微调识别模型。", "plant", "domain_data", [
    ["plant image", "dataset"], ["plant species", "dataset"], ["plantnet 300k"], ["plant dataset", "classification"]
  ], ["plant disease dataset", "leaf disease dataset"]),
  capability("plant-disease-detection", "植物病害识别", "根据叶片或植株图像识别病害类别、健康状态或病斑。", "plant-health", "domain_algorithm", [
    ["plant disease", "detection"], ["plant disease", "classification"], ["crop disease", "detection"],
    ["leaf disease", "classification"], ["plant pathology", "image"]
  ])
];

export function extractResourceCapabilities(input: {
  name: string;
  description: string;
  tags?: string[];
  readme?: string;
  paths?: string[];
}) {
  const source = normalize([
    input.name,
    input.description,
    ...(input.tags ?? []),
    (input.readme ?? "").slice(0, 24000),
    ...(input.paths ?? []).slice(0, 300)
  ].join(" "));

  return resourceCapabilityDefinitions.flatMap((definition): ResourceCapabilityMatch[] => {
    if (definition.negativePatterns?.some((pattern) => source.includes(normalize(pattern)))) return [];
    const matchedGroup = definition.patterns
      .map((group) => group.map(normalize))
      .find((group) => group.every((term) => source.includes(term)));
    if (!matchedGroup) return [];

    const allTerms = definition.patterns.flat().map(normalize);
    const matchedTerms = Array.from(new Set(allTerms.filter((term) => source.includes(term))));
    const confidence = Math.min(96, 72 + Math.min(18, (matchedTerms.length - matchedGroup.length) * 6));
    const coverageLevel = matchedTerms.length >= 3 || matchedGroup.length >= 2 ? "full" : "partial";
    return [{
      capabilityId: definition.id,
      confidence,
      coverageLevel,
      matchedTerms,
      summary: `README、标签或仓库结构明确命中“${definition.label}”：${matchedTerms.slice(0, 4).join("、")}`
    }];
  });
}

function capability(
  id: string,
  label: string,
  description: string,
  domain: string,
  role: ResourceCapabilityDefinition["role"],
  patterns: string[][],
  negativePatterns?: string[]
): ResourceCapabilityDefinition {
  return { id, label, description, domain, role, patterns, negativePatterns };
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[-_/.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
