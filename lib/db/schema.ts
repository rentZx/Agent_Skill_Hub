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

export const repositoryProviderEnum = pgEnum("repository_provider", [
  "github",
  "npm",
  "mcp_registry",
  "manual"
]);

export const resourceArtifactKindEnum = pgEnum("resource_artifact_kind", [
  "agent_skill",
  "mcp_server",
  "github_action",
  "github_app",
  "ui_library",
  "project_template",
  "library",
  "application",
  "dataset",
  "awesome_list",
  "developer_tool"
]);

export const artifactVerificationStatusEnum = pgEnum("artifact_verification_status", [
  "pending",
  "verified",
  "rejected",
  "stale"
]);

export const resourceEvidenceKindEnum = pgEnum("resource_evidence_kind", [
  "type_declaration",
  "skill_manifest",
  "mcp_manifest",
  "package_manifest",
  "project_manifest",
  "github_action",
  "github_app",
  "readme_claim",
  "license",
  "maintenance",
  "popularity",
  "manual_review"
]);

export const verificationRunStatusEnum = pgEnum("verification_run_status", [
  "passed",
  "failed",
  "partial"
]);

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
    ,industry: text("industry")
    ,projectType: text("project_type")
    ,frontend: text("frontend")
    ,backend: text("backend")
    ,databaseName: text("database_name")
    ,orm: text("orm")
    ,deploy: text("deploy")
    ,stack: text("stack").array().notNull().default(sql`'{}'::text[]`)
    ,difficulty: text("difficulty")
    ,priority: integer("priority").notNull().default(0)
    ,aiRecommendationWeight: integer("ai_recommendation_weight").notNull().default(0)
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

export const resourceRepositories = pgTable(
  "resource_repositories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    canonicalUrl: text("canonical_url").notNull(),
    provider: repositoryProviderEnum("provider").notNull(),
    owner: text("owner"),
    name: text("name").notNull(),
    description: text("description"),
    homepageUrl: text("homepage_url"),
    defaultBranch: text("default_branch"),
    license: text("license"),
    stars: integer("stars").notNull().default(0),
    forks: integer("forks").notNull().default(0),
    archived: boolean("archived").notNull().default(false),
    latestCommitAt: timestamp("latest_commit_at", { withTimezone: true }),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    canonicalUrlIdx: uniqueIndex("resource_repositories_canonical_url_idx").on(table.canonicalUrl),
    providerIdx: index("resource_repositories_provider_idx").on(table.provider),
    latestCommitIdx: index("resource_repositories_latest_commit_idx").on(table.latestCommitAt)
  })
);

export const resourceArtifacts = pgTable(
  "resource_artifacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    repositoryId: uuid("repository_id")
      .notNull()
      .references(() => resourceRepositories.id, { onDelete: "cascade" }),
    legacyResourceId: uuid("legacy_resource_id")
      .references(() => resources.id, { onDelete: "set null" }),
    legacyResourceIds: uuid("legacy_resource_ids").array().notNull().default(sql`'{}'::uuid[]`),
    artifactKey: text("artifact_key").notNull(),
    kind: resourceArtifactKindEnum("kind").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    artifactPath: text("artifact_path"),
    packageName: text("package_name"),
    installCommand: text("install_command").notNull().default(""),
    verificationStatus: artifactVerificationStatusEnum("verification_status").notNull().default("pending"),
    typeConfidence: integer("type_confidence").notNull().default(0),
    trustScore: integer("trust_score").notNull().default(0),
    qualityScore: integer("quality_score").notNull().default(0),
    riskLevel: riskLevelEnum("risk_level").notNull().default("medium"),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    repositoryArtifactIdx: uniqueIndex("resource_artifacts_repository_key_idx").on(
      table.repositoryId,
      table.artifactKey
    ),
    legacyResourceIdx: index("resource_artifacts_legacy_resource_idx").on(table.legacyResourceId),
    legacyResourceIdsIdx: index("resource_artifacts_legacy_resource_ids_idx").using(
      "gin",
      table.legacyResourceIds
    ),
    kindStatusIdx: index("resource_artifacts_kind_status_idx").on(table.kind, table.verificationStatus),
    qualityIdx: index("resource_artifacts_quality_idx").on(table.qualityScore)
  })
);

export const resourceEvidence = pgTable(
  "resource_evidence",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    artifactId: uuid("artifact_id")
      .notNull()
      .references(() => resourceArtifacts.id, { onDelete: "cascade" }),
    evidenceKey: text("evidence_key").notNull(),
    kind: resourceEvidenceKindEnum("kind").notNull(),
    sourceUrl: text("source_url"),
    sourcePath: text("source_path"),
    summary: text("summary").notNull(),
    confidence: integer("confidence").notNull().default(0),
    payload: jsonb("payload").notNull().default(sql`'{}'::jsonb`),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    artifactEvidenceIdx: uniqueIndex("resource_evidence_artifact_key_idx").on(
      table.artifactId,
      table.evidenceKey
    ),
    artifactIdx: index("resource_evidence_artifact_idx").on(table.artifactId),
    kindIdx: index("resource_evidence_kind_idx").on(table.kind)
  })
);

export const resourceVerificationRuns = pgTable(
  "resource_verification_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    artifactId: uuid("artifact_id")
      .notNull()
      .references(() => resourceArtifacts.id, { onDelete: "cascade" }),
    runKey: text("run_key").notNull(),
    source: text("source").notNull(),
    status: verificationRunStatusEnum("status").notNull(),
    classifierVersion: text("classifier_version").notNull(),
    score: integer("score").notNull().default(0),
    checks: jsonb("checks").notNull().default(sql`'{}'::jsonb`),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    runKeyIdx: uniqueIndex("resource_verification_runs_run_key_idx").on(table.runKey),
    artifactIdx: index("resource_verification_runs_artifact_idx").on(table.artifactId),
    statusIdx: index("resource_verification_runs_status_idx").on(table.status)
  })
);
