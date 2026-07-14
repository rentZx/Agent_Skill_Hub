export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      resources: {
        Row: {
          id: string;
          slug: string;
          name: string;
          type: Database["public"]["Enums"]["resource_type"];
          description: string;
          supported_agents: string[];
          install_command: string;
          use_cases: string[];
          risk_level: Database["public"]["Enums"]["risk_level"];
          trust_score: number;
          fit_score: number;
          repo_url: string;
          github_stars: number;
          github_forks: number;
          license: string | null;
          latest_commit_at: string | null;
          readme_summary: string | null;
          has_skill_md: boolean;
          has_package_json: boolean;
          has_mcp_manifest: boolean;
          source: string;
          last_updated: string;
          embedding: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          type: Database["public"]["Enums"]["resource_type"];
          description: string;
          supported_agents?: string[];
          install_command?: string;
          use_cases?: string[];
          risk_level?: Database["public"]["Enums"]["risk_level"];
          trust_score?: number;
          fit_score?: number;
          repo_url?: string;
          github_stars?: number;
          github_forks?: number;
          license?: string | null;
          latest_commit_at?: string | null;
          readme_summary?: string | null;
          has_skill_md?: boolean;
          has_package_json?: boolean;
          has_mcp_manifest?: boolean;
          source?: string;
          last_updated?: string;
          embedding?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["resources"]["Insert"]>;
        Relationships: [];
      };
      tags: {
        Row: {
          id: string;
          name: string;
          slug: string;
          category: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          category?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tags"]["Insert"]>;
        Relationships: [];
      };
      resource_tags: {
        Row: {
          resource_id: string;
          tag_id: string;
          created_at: string;
        };
        Insert: {
          resource_id: string;
          tag_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["resource_tags"]["Insert"]>;
        Relationships: [];
      };
      collections: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          description: string | null;
          resource_ids: string[];
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          description?: string | null;
          resource_ids?: string[];
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["collections"]["Insert"]>;
        Relationships: [];
      };
      project_recommendations: {
        Row: {
          id: string;
          user_id: string | null;
          project_prompt: string;
          normalized_requirements: Json;
          recommended_resource_ids: string[];
          recommendation: Json;
          codex_plan: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          project_prompt: string;
          normalized_requirements?: Json;
          recommended_resource_ids?: string[];
          recommendation: Json;
          codex_plan?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["project_recommendations"]["Insert"]>;
        Relationships: [];
      };
      risk_reports: {
        Row: {
          id: string;
          resource_id: string;
          risk_level: Database["public"]["Enums"]["risk_level"];
          security_score: number | null;
          maintenance_score: number | null;
          license_score: number | null;
          compatibility_score: number | null;
          summary: string;
          signals: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          resource_id: string;
          risk_level: Database["public"]["Enums"]["risk_level"];
          security_score?: number | null;
          maintenance_score?: number | null;
          license_score?: number | null;
          compatibility_score?: number | null;
          summary: string;
          signals?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["risk_reports"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      match_resources: {
        Args: {
          query_embedding: string;
          match_threshold?: number;
          match_count?: number;
        };
        Returns: {
          id: string;
          slug: string;
          name: string;
          type: Database["public"]["Enums"]["resource_type"];
          description: string;
          similarity: number;
        }[];
      };
    };
    Enums: {
      resource_type: "agent_skill" | "mcp_server" | "github_plugin" | "ui_component" | "template_repo";
      risk_level: "low" | "medium" | "high";
    };
    CompositeTypes: Record<string, never>;
  };
};
