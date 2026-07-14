import type { ResourceType, RiskLevel } from "@/lib/types";

export const resourceTypes = [
  "agent_skill",
  "mcp_server",
  "github_plugin",
  "ui_component",
  "template_repo"
] as const satisfies readonly ResourceType[];

export const typeLabels: Record<ResourceType, string> = {
  agent_skill: "Agent Skills",
  mcp_server: "MCP Servers",
  github_plugin: "GitHub 插件",
  ui_component: "UI 组件库",
  template_repo: "模板仓库"
};

export const riskLabels: Record<RiskLevel, string> = {
  low: "低风险",
  medium: "中风险",
  high: "高风险"
};
