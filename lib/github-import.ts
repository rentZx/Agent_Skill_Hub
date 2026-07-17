import type { ResourceType, RiskLevel } from "@/lib/types";

export type GitHubParsedResource = {
  name: string;
  type: ResourceType;
  description: string;
  tags: string[];
  supported_agents: string[];
  install_command: string;
  use_cases: string[];
  risk_level: RiskLevel;
  risk_reason?: string;
  trust_score: number;
  fit_score: number;
  repo_url: string;
  source: "github_import";
  last_updated: string;
  readme_summary: string;
  github: {
    owner: string;
    repo: string;
    stars: number;
    forks: number;
    license: string | null;
    latest_commit_time: string | null;
    topics: string[];
    has_skill_md: boolean;
    has_package_json: boolean;
    has_mcp_manifest: boolean;
    default_branch: string;
  };
};

export type GitHubParseResponse =
  | { ok: true; resource: GitHubParsedResource }
  | { ok: false; error: string };

export function parseGitHubRepoUrl(input: string) {
  try {
    const url = new URL(input.trim());
    if (url.hostname !== "github.com" && url.hostname !== "www.github.com") {
      return null;
    }

    const [owner, repo] = url.pathname.split("/").filter(Boolean);
    if (!owner || !repo) {
      return null;
    }

    return { owner, repo: repo.replace(/\.git$/, "") };
  } catch {
    return null;
  }
}

export function inferResourceType(input: {
  name: string;
  description: string;
  topics: string[];
  readme: string;
  hasSkillMd: boolean;
  hasPackageJson: boolean;
  hasMcpManifest: boolean;
}): ResourceType {
  const text = `${input.name} ${input.description} ${input.topics.join(" ")} ${input.readme.slice(0, 8000)}`.toLowerCase();

  if (input.hasSkillMd || text.includes("skill.md") || text.includes("codex skill") || text.includes("claude skill")) {
    return "agent_skill";
  }

  if (
    input.hasMcpManifest ||
    text.includes("model context protocol") ||
    text.includes("mcp server") ||
    text.includes("mcp-server")
  ) {
    return "mcp_server";
  }

  if (text.includes("github app") || text.includes("github action") || text.includes("pull request") || text.includes("copilot")) {
    return "github_plugin";
  }

  if (
    text.includes("shadcn") ||
    text.includes("tailwind") ||
    /\b(ui|component|design system|frontend library)\b/.test(text) ||
    text.includes("react")
  ) {
    return "ui_component";
  }

  if (input.hasPackageJson || text.includes("starter") || text.includes("template") || text.includes("boilerplate")) {
    return "template_repo";
  }

  return "template_repo";
}

export function buildChineseSummary(input: {
  name: string;
  description: string;
  type: ResourceType;
  readme: string;
}) {
  const cleanReadme = input.readme
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`[\]()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const readmeHint = cleanReadme.slice(0, 180);

  return `${input.name} 是一个 ${typeNameZh(input.type)} 资源。${input.description || "仓库未提供简介。"}${
    readmeHint ? ` README 显示它主要围绕：${readmeHint}` : ""
  }`;
}

export function buildUseCases(type: ResourceType, tags: string[]) {
  const base: Record<ResourceType, string[]> = {
    agent_skill: ["规范 Agent 工作流", "沉淀可复用开发方法", "辅助 Codex/Claude 完成专项任务"],
    mcp_server: ["连接外部系统和上下文", "增强 Agent 工具调用能力", "为项目提供可复用集成入口"],
    github_plugin: ["增强 GitHub 协作流程", "辅助 PR、Issue 或代码评审", "提升工程交付质量"],
    ui_component: ["快速搭建产品界面", "复用 UI 组件和交互动效", "构建高质量 SaaS 页面"],
    template_repo: ["作为项目脚手架", "参考目录结构和工程配置", "快速启动 MVP"]
  };

  const extra = tags.includes("supabase")
    ? ["Supabase 后端或数据库集成"]
    : tags.includes("playwright")
      ? ["浏览器自动化和端到端测试"]
      : tags.includes("github")
        ? ["GitHub 工作流自动化"]
        : [];

  return [...base[type], ...extra].slice(0, 4);
}

export function inferInstallCommand(input: {
  type: ResourceType;
  packageName?: string | null;
  repoUrl: string;
  hasPackageJson: boolean;
}) {
  if (input.type === "ui_component") {
    return input.packageName ? `npm install ${input.packageName}` : "Copy selected components into the project";
  }

  if (input.type === "mcp_server") {
    return input.packageName ? `npx -y ${input.packageName}` : "";
  }

  if (input.hasPackageJson && input.packageName) {
    return `npm install ${input.packageName}`;
  }

  if (input.type === "template_repo") {
    return `Use as template or clone ${input.repoUrl}`;
  }

  return "";
}

export function inferRiskLevel(input: {
  stars: number;
  license: string | null;
  latestCommitTime: string | null;
  archived: boolean;
}): RiskLevel {
  return assessRiskLevel(input).level;
}

export function assessRiskLevel(input: {
  stars: number;
  license: string | null;
  latestCommitTime: string | null;
  archived: boolean;
}) {
  const reasons: string[] = [];

  if (input.archived) {
    reasons.push("仓库已归档，通常不再维护");
  }

  const latestCommit = input.latestCommitTime ? new Date(input.latestCommitTime).getTime() : 0;
  const staleDays = latestCommit ? (Date.now() - latestCommit) / 86400000 : Number.POSITIVE_INFINITY;

  if (!input.license) {
    reasons.push("未检测到明确的 SPDX 许可证");
  }

  if (!latestCommit) {
    reasons.push("没有可验证的最近提交时间");
  } else if (staleDays > 540) {
    reasons.push("最近提交超过 18 个月，维护活跃度较低");
  }

  if (input.stars < 50) {
    reasons.push("GitHub Stars 少于 50，社区验证较少");
  }

  if (staleDays > 240 && staleDays <= 540) {
    reasons.push("最近提交超过 8 个月，维护频率需要复核");
  }

  const level: RiskLevel = input.archived || !input.license || !latestCommit || staleDays > 540
    ? "high"
    : input.stars < 50 || staleDays > 240
      ? "medium"
      : "low";

  return {
    level,
    reason: reasons.length > 0 ? reasons.join("；") : "已检测到许可证、近期维护和社区活跃度信号。"
  };
}

export function typeNameZh(type: ResourceType) {
  const labels: Record<ResourceType, string> = {
    agent_skill: "Agent Skill",
    mcp_server: "MCP Server",
    github_plugin: "GitHub AI 插件",
    ui_component: "UI 组件",
    template_repo: "模板仓库"
  };

  return labels[type];
}
