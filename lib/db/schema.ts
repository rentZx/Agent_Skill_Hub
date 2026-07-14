import { sql } from "drizzle-orm";
import {
  boolean,
  customType,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

export const resourceTypeEnum = pgEnum("resource_type", [
  "agent_skill",
  "mcp_server",
  "github_plugin",
  "ui_component",
  "template_repo"
]);

export const riskLevelEnum = pgEnum("risk_level", ["low", "medium", "high"]);

const vector = customType<{ data: string | null }>({
  dataType() {
    return "vector(1536)";
  }
});

export const resources = pgTable(
  "resources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    type: resourceTypeEnum("type").notNull(),
    description: text("description").notNull(),
    supportedAgents: text("supported_agents").array().notNull().default(sql`'{}'::text[]`),
    installCommand: text("install_command").notNull().default(""),
    useCases: text("use_cases").array().notNull().default(sql`'{}'::text[]`),
    riskLevel: riskLevelEnum("risk_level").notNull().default("medium"),
    trustScore: integer("trust_score").notNull().default(0),
    fitScore: integer("fit_score").notNull().default(0),
    repoUrl: text("repo_url").notNull().default(""),
    githubStars: integer("github_stars").notNull().default(0),
    githubForks: integer("github_forks").notNull().default(0),
    license: text("license"),
    latestCommitAt: timestamp("latest_commit_at", { withTimezone: true }),
    readmeSummary: text("readme_summary"),
    hasSkillMd: boolean("has_skill_md").notNull().default(false),
    hasPackageJson: boolean("has_package_json").notNull().default(false),
    hasMcpManifest: boolean("has_mcp_manifest").notNull().default(false),
    source: text("source").notNull().default("manual"),
    lastUpdated: date("last_updated").notNull().defaultNow(),
    embedding: vector("embedding"),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    slugIdx: uniqueIndex("resources_slug_idx").on(table.slug),
    typeIdx: index("resources_type_idx").on(table.type),
    riskLevelIdx: index("resources_risk_level_idx").on(table.riskLevel),
    trustScoreIdx: index("resources_trust_score_idx").on(table.trustScore),
    fitScoreIdx: index("resources_fit_score_idx").on(table.fitScore),
    githubStarsIdx: index("resources_github_stars_idx").on(table.githubStars)
  })
);

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    category: text("category"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    nameIdx: uniqueIndex("tags_name_idx").on(table.name),
    slugIdx: uniqueIndex("tags_slug_idx").on(table.slug)
  })
);

export const resourceTags = pgTable(
  "resource_tags",
  {
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    pk: primaryKey({ columns: [table.resourceId, table.tagId] }),
    resourceIdx: index("resource_tags_resource_idx").on(table.resourceId),
    tagIdx: index("resource_tags_tag_idx").on(table.tagId)
  })
);

export const collections = pgTable("collections", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id"),
  name: text("name").notNull(),
  description: text("description"),
  resourceIds: uuid("resource_ids").array().notNull().default(sql`'{}'::uuid[]`),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const projectRecommendations = pgTable("project_recommendations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id"),
  projectPrompt: text("project_prompt").notNull(),
  normalizedRequirements: jsonb("normalized_requirements").notNull().default(sql`'{}'::jsonb`),
  recommendedResourceIds: uuid("recommended_resource_ids").array().notNull().default(sql`'{}'::uuid[]`),
  recommendation: jsonb("recommendation").notNull(),
  codexPlan: text("codex_plan"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const riskReports = pgTable(
  "risk_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    riskLevel: riskLevelEnum("risk_level").notNull(),
    securityScore: numeric("security_score", { precision: 4, scale: 2 }),
    maintenanceScore: numeric("maintenance_score", { precision: 4, scale: 2 }),
    licenseScore: numeric("license_score", { precision: 4, scale: 2 }),
    compatibilityScore: numeric("compatibility_score", { precision: 4, scale: 2 }),
    summary: text("summary").notNull(),
    signals: jsonb("signals").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    resourceIdx: index("risk_reports_resource_idx").on(table.resourceId)
  })
);
