import { buildProjectRecommendation } from "@/lib/recommendation";
import type { ProjectRecommendation } from "@/lib/recommendation";
import type { CapabilityGraph } from "@/lib/capability-engine";
import type { Resource } from "@/lib/types";
import { extractProjectTags } from "@/lib/tag-engine";
import { assessRequirementClarity } from "@/lib/requirement-clarity";

export type ProjectAnalysis = {
  industry: string;
  projectType: string;
  platform: string;
  targetUsers: string;
  coreFeatures: string[];
  frontend: string;
  backend: string;
  database: string;
  orm: string;
  deploy: string;
  difficulty: string;
  tags: string[];
  roadmap: string[];
};

export type AnalyzerResult = {
  analysis: ProjectAnalysis;
  recommendation: ProjectRecommendation;
};

type Rule = {
  terms: string[];
  industry: string;
  projectType: string;
  targetUsers: string;
  features: string[];
};

const rules: Rule[] = [
  { terms: ["2d转3d", "2d 转 3d", "image-to-3d", "image to 3d", "img2threejs"], industry: "计算机图形学", projectType: "图像转 3D 工具", targetUsers: "3D 设计师、游戏开发者和需要快速生成三维资产的创作者", features: ["上传二维参考图像", "估计深度与几何结构", "生成可编辑三维模型", "使用 Three.js/WebGL 预览模型", "导出 GLB、OBJ 或 STL 文件"] },
  { terms: ["做饭", "菜谱", "食谱", "吃什么", "备菜", "烹饪", "饭菜", "料理"], industry: "餐饮、家庭与营养健康", projectType: "个性化菜谱推荐 Web 应用", targetUsers: "家庭用户、不同年龄段用餐者和有忌口或过敏限制的人群", features: ["根据现有食材检索和推荐菜品", "按用餐人数换算食材用量", "按年龄、营养目标和用餐场景推荐菜品", "过滤忌口、过敏原和饮食偏好", "展示备菜清单与分步骤制作过程", "收藏菜谱、规划菜单和生成购物清单"] },
  { terms: ["美食", "餐饮"], industry: "餐饮与生活服务", projectType: "美食相关产品（具体方向待确认）", targetUsers: "待确认，可能面向家庭用户、消费者、内容读者或餐饮商家", features: ["美食内容浏览或搜索（具体业务流程待确认）"] },
  { terms: ["炒股", "股票", "股市", "证券行情", "a股", "量化交易", "stock market", "stock trading"], industry: "证券与量化金融", projectType: "股票行情与分析平台", targetUsers: "个人投资者、量化研究员和需要跟踪市场走势的分析人员", features: ["实时获取股票、指数和板块行情", "展示 K 线、分时图和成交量", "计算均线、MACD、RSI、布林带等技术指标", "管理自选股、价格提醒和市场新闻", "策略回测与走势分析"] },
  { terms: ["超市", "货物", "商品价格", "库位", "货架", "仓库管理"], industry: "零售与仓储管理", projectType: "语音查询型商品库存管理系统", targetUsers: "超市经营者、店员和仓库管理人员", features: ["管理商品档案与销售价格", "记录库存数量和出入库变化", "管理仓库、货架和商品所在位置", "通过中文语音查询商品价格、数量和位置", "把语音问题转换为受约束的库存查询", "返回有数据依据的查询结果"] },
  { terms: ["画室", "绘画", "美术", "培训", "课程"], industry: "教育培训", projectType: "SaaS 管理系统", targetUsers: "校长、老师、学生和家长", features: ["课程与班级管理", "学生档案", "教师排课", "家长通知", "缴费记录"] },
  { terms: ["crm", "客户", "线索", "销售", "获客"], industry: "销售与客户管理", projectType: "CRM / SaaS", targetUsers: "销售、运营和管理者", features: ["客户档案", "线索跟进", "销售漏斗", "团队协作", "数据报表"] },
  { terms: ["erp", "库存", "采购", "供应链", "财务"], industry: "企业经营管理", projectType: "ERP 管理系统", targetUsers: "企业管理者、财务和运营团队", features: ["组织权限", "采购与库存", "订单管理", "财务数据", "经营报表"] },
  { terms: ["agent", "智能体", "ai", "人工智能"], industry: "人工智能", projectType: "AI Agent 应用", targetUsers: "开发者和业务用户", features: ["任务编排", "工具调用", "知识检索", "运行记录", "结果导出"] }
];

const defaultRule: Rule = {
  terms: [],
  industry: "通用互联网产品",
  projectType: "Web SaaS 应用",
  targetUsers: "产品、运营和业务用户",
  features: ["用户输入", "业务数据管理", "搜索与筛选", "后台管理", "结果导出"]
};

function includesTerm(input: string, term: string) {
  return input.toLowerCase().includes(term.toLowerCase());
}

export type ProjectAnalysisOverrides = Partial<Omit<ProjectAnalysis, "roadmap">>;

export function analyzeProject(
  input: string,
  resources: Resource[],
  overrides: ProjectAnalysisOverrides = {},
  capabilityGraph?: CapabilityGraph
): AnalyzerResult {
  const normalized = input.trim() || "通用 SaaS 项目";
  const clarity = assessRequirementClarity(normalized);
  const isLowConfidence = clarity.confidence === "low";
  const matchedRules = rules.filter((rule) => rule.terms.some((term) => includesTerm(normalized, term)));
  const rule = matchedRules[0] ?? defaultRule;
  const projectTags = extractProjectTags(normalized)
    .filter((tag) => !isLowConfidence || tag.weight > 3);
  const overrideTags = isLowConfidence
    ? (overrides.tags ?? []).filter(isLowConfidenceDomainTag)
    : overrides.tags ?? [];
  const tags = Array.from(new Set([...projectTags.map((tag) => tag.label), ...overrideTags]));
  const analysis: ProjectAnalysis = {
    industry: rule.industry,
    projectType: rule.projectType,
    platform: isLowConfidence ? "待确认（Web、移动端或小程序）" : "Web 管理后台",
    targetUsers: rule.targetUsers,
    coreFeatures: rule.features,
    frontend: isLowConfidence ? "待确认产品形态后选择" : "Next.js + React + Tailwind CSS + shadcn/ui",
    backend: isLowConfidence ? "待确认核心流程和外部接口后选择" : "Next.js Route Handlers",
    database: isLowConfidence ? "待确认数据类型和数据来源后选择" : "PostgreSQL",
    orm: isLowConfidence ? "随数据库选型确定" : "Drizzle ORM",
    deploy: isLowConfidence ? "待确认上线平台后选择" : "Docker / Vercel",
    difficulty: isLowConfidence ? "待评估" : rule === defaultRule ? "中等" : "中等偏上",
    roadmap: isLowConfidence
      ? ["确认产品方向与目标用户", "明确核心流程和数据来源", "完成技术选型与资源复核", "确认后再生成实施路线"]
      : ["数据库与核心数据模型", "后台与业务流程", "前端页面与交互", "测试、部署与上线检查"],
    ...overrides,
    tags
  };
  const recommendationInput = `${normalized} ${tags.join(" ")}`.trim();
  const recommendation = buildProjectRecommendation(recommendationInput, resources, {
    projectType: analysis.projectType,
    targetUsers: analysis.targetUsers,
    coreFeatures: analysis.coreFeatures,
    techStack: [analysis.frontend, analysis.backend, analysis.database, analysis.orm, analysis.deploy],
    capabilityGraph,
    clarity
  });

  return {
    analysis,
    recommendation: {
      ...recommendation,
      codexPrompt: buildAnalyzerPrompt(normalized, analysis, recommendation.codexPrompt, recommendation.clarity)
    }
  };
}

function isLowConfidenceDomainTag(tag: string) {
  return /(food|recipe|meal|cooking|restaurant|dining|cuisine|餐饮|美食|菜谱|食谱)/i.test(tag);
}

export function buildAnalyzerPrompt(
  input: string,
  analysis: ProjectAnalysis,
  basePrompt: string,
  clarity = assessRequirementClarity(input)
) {
  const clarityText = clarity.confidence === "low"
    ? `\n\n## 需求完整度\n- 置信度：低\n- 说明：${clarity.summary}\n- 待确认：\n${clarity.clarifyingQuestions.map((item) => `  - ${item}`).join("\n")}`
    : "";
  const architectureTitle = clarity.confidence === "low" ? "候选技术架构（暂不锁定）" : "技术架构";

  return `# Agent Skill Hub Project Analyzer\n\n项目需求：${input}${clarityText}\n\n## 项目分析\n- 行业：${analysis.industry}\n- 类型：${analysis.projectType}\n- 平台：${analysis.platform}\n- 目标用户：${analysis.targetUsers}\n- 难度：${analysis.difficulty}\n\n## ${architectureTitle}\n- Frontend: ${analysis.frontend}\n- Backend: ${analysis.backend}\n- Database: ${analysis.database}\n- ORM: ${analysis.orm}\n- Deploy: ${analysis.deploy}\n\n## 开发路线\n${analysis.roadmap.map((item, index) => `${index + 1}. ${item}`).join("\n")}\n\n## Resource recommendations\n${basePrompt}`;
}
