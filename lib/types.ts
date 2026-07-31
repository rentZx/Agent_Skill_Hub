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
  last_synced_at?: string;
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
  risk_reason?: string;
  has_skill_md?: boolean;
  has_mcp_manifest?: boolean;
  has_package_json?: boolean;
  has_project_manifest?: boolean;
  has_github_action?: boolean;
  artifact_path?: string;
  is_curated?: boolean;
  matched_capabilities?: string[];
  evidence_summary?: string;
  discovery_classifier_version?: string;
};

export type Resource = SeedResource & {
  id: string;
  slug: string;
  verification_status?: "pending" | "verified" | "rejected" | "stale";
  artifact_kind?:
    | "agent_skill"
    | "mcp_server"
    | "github_action"
    | "github_app"
    | "ui_library"
    | "project_template"
    | "library"
    | "application"
    | "dataset"
    | "awesome_list"
    | "developer_tool";
  type_confidence?: number;
};

export type ResourceFilters = {
  query?: string;
  type?: ResourceType | "all";
  tag?: string;
  risk?: RiskLevel | "all";
};
