export type RequirementConfidence = "low" | "medium" | "high";

export type RequirementClarity = {
  confidence: RequirementConfidence;
  summary: string;
  confirmedRequirements: string[];
  assumptions: string[];
  clarifyingQuestions: string[];
};

const ambiguousTopics: Record<string, Omit<RequirementClarity, "confidence">> = {
  "美食": {
    summary: "当前只确认项目与美食相关，尚不能确定具体产品形态。",
    confirmedRequirements: ["项目主题与美食相关"],
    assumptions: ["可能是菜谱工具、餐厅发现、外卖服务、美食内容社区或营养管理产品"],
    clarifyingQuestions: [
      "你要解决的是做饭和菜谱、餐厅发现和点评、外卖下单，还是美食内容分享？",
      "用户最核心的一步操作是什么，例如输入食材、搜索附近餐厅或浏览内容？",
      "是否需要账号、定位、商家数据、营养规则或 AI 生成功能？"
    ]
  }
};

const actionTerms = [
  "开发", "做一个", "实现", "构建", "创建", "管理", "查询", "搜索", "推荐", "分析", "生成",
  "展示", "上传", "转换", "识别", "获取", "根据", "支持", "需要", "能够", "可以",
  "软件", "系统", "平台", "网站", "网页", "应用", "工具", "转3d",
  "build", "create", "develop", "search", "recommend", "manage", "analyze", "generate"
];

export function assessRequirementClarity(input: string): RequirementClarity {
  const normalized = normalizeTopic(input);
  const ambiguous = ambiguousTopics[normalized];
  if (ambiguous) {
    return {
      confidence: "low",
      ...ambiguous
    };
  }

  const trimmed = input.trim();
  const hasAction = actionTerms.some((term) => trimmed.toLowerCase().includes(term.toLowerCase()));
  const confidence: RequirementConfidence = trimmed.length >= 18 && hasAction
    ? "high"
    : trimmed.length >= 8 || hasAction
      ? "medium"
      : "low";

  if (confidence === "low") {
    return {
      confidence,
      summary: "当前输入更像项目主题，缺少明确的用户、核心流程和数据来源。",
      confirmedRequirements: [`项目主题：${trimmed || "未提供"}`],
      assumptions: ["产品形态、目标用户、核心功能和技术约束尚未确认"],
      clarifyingQuestions: [
        "这个产品主要给谁使用？",
        "用户进入产品后最重要的一步操作是什么？",
        "必须接入哪些数据源、平台或现有系统？"
      ]
    };
  }

  return {
    confidence,
    summary: confidence === "high"
      ? "需求包含较明确的目标或业务动作，可以生成实施建议。"
      : "需求已有业务方向，但部分产品和技术约束仍需在开发前确认。",
    confirmedRequirements: [trimmed],
    assumptions: [],
    clarifyingQuestions: confidence === "medium"
      ? ["目标用户、数据来源和上线平台是否有额外限制？"]
      : []
  };
}

function normalizeTopic(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[，。！？、,.!?\s]+/g, "");
}
