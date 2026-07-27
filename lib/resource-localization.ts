import type { Resource, ResourceType } from "@/lib/types";

type LocalizableResource = Pick<Resource, "name" | "type" | "description" | "tags" | "use_cases">;

const typeOpeners: Record<ResourceType, string> = {
  agent_skill: "这是一个可复用的 Agent Skill，",
  mcp_server: "这是一个用于扩展 Agent 能力的 MCP Server，",
  github_plugin: "这是一个面向 GitHub 协作的插件或自动化工作流，",
  ui_component: "这是一个可复用的前端 UI 组件库或组件集合，",
  template_repo: "这是一个可作为项目起点的模板仓库，"
};

const typeClosers: Record<ResourceType, string> = {
  agent_skill: "接入前应阅读技能文件，确认适用的 Agent、执行范围和项目约束。",
  mcp_server: "启用前应核对工具权限、数据范围、凭证配置和运行方式。",
  github_plugin: "启用前应确认仓库权限、自动化触发条件和生成内容的审核边界。",
  ui_component: "接入前应核对技术栈、依赖版本、组件许可证和视觉适配成本。",
  template_repo: "使用前应核对依赖、许可证、目录结构、维护状态和部署方式。"
};

const topicRules: Array<{ terms: string[]; label: string }> = [
  { terms: ["recipe", "recipes", "cooking", "food", "meal", "ingredient"], label: "菜谱、食材和烹饪流程" },
  { terms: ["browser", "playwright", "selenium", "web automation"], label: "浏览器自动化、页面操作和端到端验证" },
  { terms: ["github", "pull request", "issue", "review", "actions", "copilot"], label: "GitHub 仓库协作、Issue、PR 和代码评审" },
  { terms: ["docs", "documentation", "api", "context7"], label: "文档检索、API 参考和开发上下文" },
  { terms: ["database", "postgres", "supabase", "sql", "storage"], label: "数据库连接、查询和数据存储" },
  { terms: ["react", "next.js", "component", "ui", "design system", "tailwind", "radix"], label: "React/Next.js 界面、组件和设计系统" },
  { terms: ["ai", "agent", "llm", "model", "prompt", "mcp"], label: "AI Agent、模型调用和工具工作流" },
  { terms: ["template", "starter", "boilerplate", "nextjs", "fullstack"], label: "项目脚手架、页面结构和工程配置" },
  { terms: ["scrape", "crawl", "firecrawl", "search", "research"], label: "网页采集、搜索和资料整理" },
  { terms: ["test", "testing", "ci", "lint", "quality", "audit"], label: "自动化测试、质量检查和持续集成" },
  { terms: ["memory", "knowledge", "rag", "embedding", "vector"], label: "知识管理、记忆和语义检索" }
];

export function getLocalizedResourceDescription(resource: LocalizableResource) {
  const topics = inferTopics(resource);
  const topicText = topics.length > 0
    ? `主要覆盖${topics.slice(0, 2).join("、")}。`
    : "主要用于项目开发、集成和交付过程中的能力复用。";

  return `${typeOpeners[resource.type]}${topicText}${typeClosers[resource.type]}`;
}

export function getLocalizedUseCases(resource: LocalizableResource) {
  const topics = inferTopics(resource);
  const topicCase = topics[0] ? `${topics[0]}相关功能实现` : "项目开发与能力复用";
  const typeCases: Record<ResourceType, string[]> = {
    agent_skill: ["需求拆解与开发流程规范", "代码实现、验证与交付协作"],
    mcp_server: ["连接外部工具、文档或数据源", "为 Agent 提供项目开发上下文"],
    github_plugin: ["仓库协作与自动化流程", "Issue、PR、代码评审或质量检查"],
    ui_component: ["页面布局与可复用组件", "表单、卡片、筛选器和交互体验"],
    template_repo: ["项目初始化与工程配置", "页面结构、业务示例或部署参考"]
  };

  return Array.from(new Set([topicCase, ...typeCases[resource.type]])).slice(0, 3);
}

export function getLocalizedRecommendationReason(resource: LocalizableResource, score?: number) {
  const topics = inferTopics(resource);
  const topicText = topics[0] ?? "项目开发能力";
  const scoreText = typeof score === "number" ? `，本次方案适配度为 ${Math.round(score)}/100` : "";
  return `该资源主要覆盖${topicText}，可用于当前项目的对应开发环节${scoreText}。${typeClosers[resource.type]}`;
}

function inferTopics(resource: LocalizableResource) {
  const source = `${resource.name} ${resource.description} ${resource.tags.join(" ")} ${resource.use_cases.join(" ")}`.toLowerCase();
  return topicRules
    .filter((rule) => rule.terms.some((term) => source.includes(term)))
    .map((rule) => rule.label);
}
