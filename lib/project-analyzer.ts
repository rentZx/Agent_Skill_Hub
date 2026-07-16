import { buildProjectRecommendation } from "@/lib/recommendation";
import type { ProjectRecommendation } from "@/lib/recommendation";
import type { Resource } from "@/lib/types";
import { extractProjectTags } from "@/lib/tag-engine";

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
  { terms: ["做饭", "菜谱", "食谱", "吃什么", "备菜", "烹饪", "饭菜", "料理"], industry: "餐饮与生活服务", projectType: "菜谱推荐 Web 应用", targetUsers: "家庭用户和需要快速决定吃什么的人", features: ["随机或按条件推荐菜谱", "按用餐人数调整菜品和食材用量", "展示备菜清单", "展示分步骤制作过程", "收藏和复用喜欢的菜谱"] },
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

export function analyzeProject(input: string, resources: Resource[], overrides: ProjectAnalysisOverrides = {}): AnalyzerResult {
  const normalized = input.trim() || "通用 SaaS 项目";
  const matchedRules = rules.filter((rule) => rule.terms.some((term) => includesTerm(normalized, term)));
  const rule = matchedRules[0] ?? defaultRule;
  const projectTags = extractProjectTags(normalized);
  const tags = Array.from(new Set([...projectTags.map((tag) => tag.label), ...(overrides.tags ?? [])]));
  const analysis: ProjectAnalysis = {
    industry: rule.industry,
    projectType: rule.projectType,
    platform: "Web 管理后台",
    targetUsers: rule.targetUsers,
    coreFeatures: rule.features,
    frontend: "Next.js + React + Tailwind CSS + shadcn/ui",
    backend: "Next.js Route Handlers",
    database: "PostgreSQL",
    orm: "Drizzle ORM",
    deploy: "Docker / Vercel",
    difficulty: rule === defaultRule ? "中等" : "中等偏上",
    roadmap: ["数据库与核心数据模型", "后台与业务流程", "前端页面与交互", "测试、部署与上线检查"],
    ...overrides,
    tags
  };
  const recommendation = buildProjectRecommendation(`${normalized} ${tags.join(" ")}`, resources, {
    projectType: analysis.projectType,
    targetUsers: analysis.targetUsers,
    coreFeatures: analysis.coreFeatures,
    techStack: [analysis.frontend, analysis.backend, analysis.database, analysis.orm, analysis.deploy]
  });

  return {
    analysis,
    recommendation: {
      ...recommendation,
      codexPrompt: buildAnalyzerPrompt(normalized, analysis, recommendation.codexPrompt)
    }
  };
}

export function buildAnalyzerPrompt(input: string, analysis: ProjectAnalysis, basePrompt: string) {
  return `# Agent Skill Hub Project Analyzer\n\n项目需求：${input}\n\n## 项目分析\n- 行业：${analysis.industry}\n- 类型：${analysis.projectType}\n- 平台：${analysis.platform}\n- 目标用户：${analysis.targetUsers}\n- 难度：${analysis.difficulty}\n\n## 技术架构\n- Frontend: ${analysis.frontend}\n- Backend: ${analysis.backend}\n- Database: ${analysis.database}\n- ORM: ${analysis.orm}\n- Deploy: ${analysis.deploy}\n\n## 开发路线\n${analysis.roadmap.map((item, index) => `${index + 1}. ${item}`).join("\n")}\n\n## Resource recommendations\n${basePrompt}`;
}
