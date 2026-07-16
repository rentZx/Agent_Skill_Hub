export type ResourceType =
  | "agent_skill"
  | "mcp_server"
  | "github_plugin"
  | "ui_component"
  | "template_repo";

export type RiskLevel = "low" | "medium" | "high";

export type SeedResource = {
  name: string;
  type: ResourceType;
  description: string;
  tags: string[];
  supported_agents: string[];
  install_command: string;
  use_cases: string[];
  risk_level: RiskLevel;
  trust_score: number;
  fit_score: number;
  repo_url: string;
  source: string;
  last_updated: string;
  industry?: string;
  project_type?: string;
  frontend?: string;
  backend?: string;
  database?: string;
  orm?: string;
  deploy?: string;
  stack?: string[];
  difficulty?: string;
  priority?: number;
  ai_recommendation_weight?: number;
  github_stars?: number;
  github_forks?: number;
  license?: string | null;
  latest_commit_at?: string | null;
  readme_summary?: string;
};

export type Resource = SeedResource & {
  id: string;
  slug: string;
};

export type ResourceFilters = {
  query?: string;
  type?: ResourceType | "all";
  tag?: string;
  risk?: RiskLevel | "all";
};
