import type { ResourceType, RiskLevel, SeedResource } from "@/lib/types";
import { assessRiskLevel } from "@/lib/github-import";

type GitHubRepository = {
  full_name: string;
  name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  topics?: string[];
  license: { spdx_id: string | null; name: string } | null;
  pushed_at: string | null;
  archived: boolean;
  default_branch: string;
};

type NpmPackage = {
  name: string;
  version: string;
  description?: string;
  keywords?: string[];
  date?: string;
  links?: { npm?: string; homepage?: string; repository?: string };
};

type McpServer = {
  name: string;
  title?: string;
  description?: string;
  version?: string;
  repository?: { url?: string; source?: string };
  packages?: Array<{ registryType?: string; identifier?: string; version?: string }>;
  remotes?: Array<{ type?: string; url?: string }>;
};

type McpRegistryResponse = {
  servers?: Array<{
    server?: McpServer;
    _meta?: { "io.modelcontextprotocol.registry/official"?: { status?: string; isLatest?: boolean; updatedAt?: string } };
  }>;
  metadata?: { nextCursor?: string; count?: number };
};

export type CatalogCandidate = SeedResource & {
  slug: string;
  metadata: Record<string, unknown>;
};

export type CatalogSyncOptions = {
  limitPerQuery?: number;
  mcpLimit?: number;
  sources?: Set<"github" | "mcp" | "npm">;
};

const githubQueries: Array<{ type: ResourceType; query: string; tags: string[] }> = [
  { type: "agent_skill", query: "skill.md in:name,description,readme", tags: ["skills", "agent-skill"] },
  { type: "agent_skill", query: "agent skill in:readme", tags: ["skills", "agent-skill"] },
  { type: "agent_skill", query: "codex skill in:name,description,readme", tags: ["codex", "skills"] },
  { type: "github_plugin", query: "org:openai plugins in:name,description,readme", tags: ["openai", "codex", "plugins"] },
  { type: "github_plugin", query: "github action ai review", tags: ["github", "actions", "review"] },
  { type: "github_plugin", query: "github app code review", tags: ["github", "github-app", "review"] },
  { type: "github_plugin", query: "github copilot coding agent", tags: ["github", "copilot", "coding-agent"] },
  { type: "ui_component", query: "react component library", tags: ["react", "components", "ui"] },
  { type: "ui_component", query: "tailwind component library", tags: ["tailwind", "components", "ui"] },
  { type: "ui_component", query: "shadcn ui components", tags: ["shadcn", "components", "ui"] },
  { type: "template_repo", query: "nextjs starter template", tags: ["nextjs", "starter", "template"] },
  { type: "template_repo", query: "nextjs boilerplate", tags: ["nextjs", "boilerplate", "template"] },
  { type: "template_repo", query: "org:vercel nextjs examples", tags: ["nextjs", "vercel", "examples"] }
];

const npmQueries: Array<{ type: ResourceType; query: string; tags: string[] }> = [
  { type: "ui_component", query: "react component library", tags: ["react", "components", "ui"] },
  { type: "ui_component", query: "tailwind ui components", tags: ["tailwind", "components", "ui"] },
  { type: "ui_component", query: "shadcn radix ui", tags: ["shadcn", "radix", "ui"] },
  { type: "mcp_server", query: "mcp server", tags: ["mcp", "mcp-server"] }
];

export async function syncResourceCatalog(options: CatalogSyncOptions = {}) {
  const limitPerQuery = Math.min(Math.max(options.limitPerQuery ?? 20, 1), 50);
  const mcpLimit = Math.min(Math.max(options.mcpLimit ?? 100, 1), 500);
  const sources = options.sources ?? new Set(["github", "mcp", "npm"]);
  const candidates: CatalogCandidate[] = [];

  if (sources.has("github")) {
    candidates.push(...await syncGitHubCatalog(limitPerQuery));
  }

  if (sources.has("mcp")) {
    candidates.push(...await syncMcpRegistry(mcpLimit));
  }

  if (sources.has("npm")) {
    candidates.push(...await syncNpmCatalog(limitPerQuery));
  }

  return dedupeCandidates(candidates);
}

async function syncGitHubCatalog(limit: number) {
  const candidates: CatalogCandidate[] = [];

  for (const config of githubQueries) {
    try {
      const repositories = await fetchGitHubRepositories(config.query, limit);
      candidates.push(...repositories.filter((repository) => isRelevantGitHubRepository(repository, config.type)).map((repository) => mapGitHubRepository(repository, config)));
    } catch (error) {
      console.warn(`GitHub catalog query failed: ${config.query}`, error);
      if (error instanceof Error && error.message.includes(" 403 ")) break;
    }
  }

  return candidates;
}

function isRelevantGitHubRepository(repository: GitHubRepository, type: ResourceType) {
  const text = `${repository.name} ${repository.description ?? ""} ${(repository.topics ?? []).join(" ")}`.toLowerCase();
  if (type === "agent_skill") return /(skill|agent|codex|claude|prompt|workflow)/.test(text);
  if (type === "github_plugin") return /(github|action|pull request|review|copilot|agent)/.test(text);
  if (type === "ui_component") return /(react|component|ui|tailwind|shadcn|radix|design system|frontend)/.test(text);
  return /(template|starter|boilerplate|next|fullstack|example)/.test(text);
}

async function fetchGitHubRepositories(query: string, limit: number) {
  const params = new URLSearchParams({ q: `${query} archived:false fork:false`, sort: "stars", order: "desc", per_page: String(limit) });
  const data = await fetchJson<{ items?: GitHubRepository[] }>(`https://api.github.com/search/repositories?${params.toString()}`, githubHeaders());
  return data.items ?? [];
}

function mapGitHubRepository(repository: GitHubRepository, config: { type: ResourceType; query: string; tags: string[] }): CatalogCandidate {
  const risk = assessRiskLevel({
    stars: repository.stargazers_count,
    license: repository.license?.spdx_id ?? null,
    latestCommitTime: repository.pushed_at,
    archived: repository.archived
  });
  const tags = Array.from(new Set([
    ...config.tags,
    ...(repository.topics ?? []),
    repository.language?.toLowerCase() ?? "",
    config.type.replace("_", "-")
  ].filter(Boolean))).slice(0, 20);

  return {
    slug: `catalog-github-${repository.full_name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    name: repository.name,
    type: config.type,
    description: repository.description ?? `${repository.name} GitHub repository`,
    tags,
    supported_agents: config.type === "mcp_server" ? ["Codex", "Claude", "Cursor"] : ["Codex"],
    install_command: installCommandForGitHub(config.type, repository.html_url),
    use_cases: getUseCasesForType(config.type),
    risk_level: risk.level,
    risk_reason: risk.reason,
    trust_score: Math.min(95, 35 + Math.min(32, Math.floor(Math.log10(Math.max(repository.stargazers_count, 1)) * 12)) + (repository.license ? 16 : 0) + (risk.level === "low" ? 22 : risk.level === "medium" ? 12 : 4)),
    fit_score: Math.min(92, 58 + Math.min(24, Math.floor(Math.log10(Math.max(repository.stargazers_count, 1)) * 8)) + (repository.topics?.length ? 8 : 0)),
    repo_url: repository.html_url,
    source: "github_catalog",
    last_updated: (repository.pushed_at ?? new Date().toISOString()).slice(0, 10),
    github_stars: repository.stargazers_count,
    github_forks: repository.forks_count,
    license: repository.license?.spdx_id ?? null,
    latest_commit_at: repository.pushed_at,
    readme_summary: repository.description ?? `${repository.name} GitHub repository`,
    metadata: {
      source_kind: "github_api",
      source_query: config.query,
      source_url: repository.html_url,
      default_branch: repository.default_branch,
      synced_at: new Date().toISOString()
    }
  };
}

async function syncMcpRegistry(limit: number) {
  const candidates: CatalogCandidate[] = [];
  let cursor = "";

  while (candidates.length < limit) {
    try {
      const params = new URLSearchParams({ limit: String(Math.min(100, limit - candidates.length)) });
      if (cursor) params.set("cursor", cursor);
      const data = await fetchJson<McpRegistryResponse>(`https://registry.modelcontextprotocol.io/v0.1/servers?${params.toString()}`);

      for (const entry of data.servers ?? []) {
        if (entry.server) candidates.push(mapMcpServer(entry.server, entry._meta?.["io.modelcontextprotocol.registry/official"]));
      }

      const nextCursor = data.metadata?.nextCursor;
      if (!nextCursor || nextCursor === cursor || (data.servers ?? []).length === 0) break;
      cursor = nextCursor;
    } catch (error) {
      console.warn("MCP Registry sync failed.", error);
      break;
    }
  }

  return candidates.slice(0, limit);
}

function mapMcpServer(server: McpServer, official?: { status?: string; isLatest?: boolean; updatedAt?: string }): CatalogCandidate {
  const description = server.description ?? `${server.title ?? server.name} MCP Server`;
  const packageInfo = server.packages?.find((item) => item.registryType === "npm" && item.identifier);
  const repositoryUrl = normalizeRepositoryUrl(server.repository?.url ?? server.remotes?.find((remote) => remote.url)?.url ?? `https://registry.modelcontextprotocol.io/?server=${encodeURIComponent(server.name)}`);
  const capabilityRisk = /(filesystem|file system|shell|terminal|exec|command|browser automation|database write|write access)/i.test(`${server.name} ${description}`);
  const riskLevel: RiskLevel = capabilityRisk ? "high" : server.repository?.url ? "medium" : "medium";
  const riskReason = capabilityRisk
    ? "服务器描述包含本地文件、Shell、执行命令或写入数据能力，接入前必须限制权限和数据范围。"
    : server.repository?.url
      ? "已从官方 MCP Registry 发现，并提供仓库来源；仍需核对工具权限、许可证和运行环境。"
      : "官方 Registry 条目缺少可验证的源代码仓库，接入前需要人工核验来源和权限。";
  const install = packageInfo?.identifier ? `npx -y ${packageInfo.identifier}` : `Review MCP configuration from ${repositoryUrl}`;
  const tags = Array.from(new Set(["mcp", "mcp-server", "registry", ...extractTags(`${server.name} ${description}`)])).slice(0, 18);

  return {
    slug: `catalog-mcp-${server.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    name: server.title ?? server.name,
    type: "mcp_server",
    description,
    tags,
    supported_agents: ["Codex", "Claude", "Cursor"],
    install_command: install,
    use_cases: ["连接外部工具和数据源", "扩展 Agent 上下文和工具调用能力"],
    risk_level: riskLevel,
    risk_reason: riskReason,
    trust_score: official?.status === "active" ? 78 : 68,
    fit_score: 72,
    repo_url: repositoryUrl,
    source: "mcp_registry",
    last_updated: (official?.updatedAt ?? new Date().toISOString()).slice(0, 10),
    license: null,
    latest_commit_at: null,
    readme_summary: description,
    metadata: {
      source_kind: "mcp_registry",
      registry_name: server.name,
      version: server.version,
      package: packageInfo,
      remotes: server.remotes,
      official_status: official?.status,
      is_latest: official?.isLatest,
      synced_at: new Date().toISOString()
    }
  };
}

async function syncNpmCatalog(limit: number) {
  const candidates: CatalogCandidate[] = [];

  for (const config of npmQueries) {
    try {
      const params = new URLSearchParams({ text: config.query, size: String(limit) });
      const data = await fetchJson<{ objects?: Array<{ package?: NpmPackage }> }>(`https://registry.npmjs.org/-/v1/search?${params.toString()}`);
      for (const result of data.objects ?? []) {
        if (!result.package || !isRelevantNpmPackage(result.package, config.type)) continue;
        candidates.push(mapNpmPackage(result.package, config));
      }
    } catch (error) {
      console.warn(`npm catalog query failed: ${config.query}`, error);
    }
  }

  return candidates;
}

function mapNpmPackage(pkg: NpmPackage, config: { type: ResourceType; query: string; tags: string[] }): CatalogCandidate {
  const publishedAt = pkg.date ?? new Date().toISOString();
  const ageDays = (Date.now() - new Date(publishedAt).getTime()) / 86400000;
  const riskLevel: RiskLevel = ageDays > 540 ? "high" : pkg.links?.repository ? "medium" : "medium";
  const riskReason = ageDays > 540
    ? "npm 包最近发布版本超过 18 个月，维护活跃度需要重点复核。"
    : pkg.links?.repository
      ? "已发现 npm 包和仓库来源；接入前仍需核对许可证、依赖和安装脚本。"
      : "npm 包缺少可验证的仓库来源，接入前需要人工核验维护者和许可证。";
  const repoUrl = normalizeRepositoryUrl(pkg.links?.repository ?? pkg.links?.homepage ?? `https://www.npmjs.com/package/${pkg.name}`);

  return {
    slug: `catalog-npm-${pkg.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    name: pkg.name,
    type: config.type,
    description: pkg.description ?? `${pkg.name} npm package`,
    tags: Array.from(new Set([...config.tags, ...(pkg.keywords ?? []).slice(0, 14), config.type.replace("_", "-")])).slice(0, 20),
    supported_agents: ["Codex"],
    install_command: `npm install ${pkg.name}`,
    use_cases: config.type === "mcp_server" ? ["通过 npm 接入 MCP Server", "扩展 Agent 工具能力"] : ["复用前端组件和交互", "构建 React/Next.js 产品界面"],
    risk_level: riskLevel,
    risk_reason: riskReason,
    trust_score: pkg.links?.repository ? 70 : 58,
    fit_score: config.type === "mcp_server" ? 68 : 76,
    repo_url: repoUrl,
    source: "npm_catalog",
    last_updated: publishedAt.slice(0, 10),
    license: null,
    latest_commit_at: null,
    readme_summary: pkg.description ?? `${pkg.name} npm package`,
    metadata: {
      source_kind: "npm_registry",
      source_query: config.query,
      package_name: pkg.name,
      version: pkg.version,
      npm_url: pkg.links?.npm ?? `https://www.npmjs.com/package/${pkg.name}`,
      published_at: publishedAt,
      synced_at: new Date().toISOString()
    }
  };
}

function isRelevantNpmPackage(pkg: NpmPackage, type: ResourceType) {
  const text = `${pkg.name} ${pkg.description ?? ""} ${(pkg.keywords ?? []).join(" ")}`.toLowerCase();
  if (type === "mcp_server") return /\bmcp\b|model-context-protocol/.test(text);
  return /(react|component|ui|tailwind|shadcn|radix|design-system|frontend)/.test(text) && !/^@types\//.test(pkg.name);
}

function dedupeCandidates(candidates: CatalogCandidate[]) {
  const merged = new Map<string, CatalogCandidate>();

  for (const candidate of candidates) {
    const key = candidate.repo_url || `${candidate.source}:${candidate.name}`;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, candidate);
      continue;
    }

    existing.tags = Array.from(new Set([...existing.tags, ...candidate.tags])).slice(0, 20);
    existing.metadata = { ...existing.metadata, duplicate_sources: [...((existing.metadata.duplicate_sources as string[] | undefined) ?? []), candidate.source] };
    const candidateIsLatest = candidate.metadata.is_latest === true;
    const existingIsLatest = existing.metadata.is_latest === true;
    if ((candidateIsLatest && !existingIsLatest) || candidate.trust_score > existing.trust_score) {
      merged.set(key, { ...existing, ...candidate, tags: existing.tags, metadata: existing.metadata });
    }
  }

  return Array.from(merged.values());
}

async function fetchJson<T>(url: string, headers?: Record<string, string>) {
  const response = await fetch(url, { headers: { Accept: "application/json", ...headers }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Resource source request failed: ${response.status} ${url}`);
  return await response.json() as T;
}

function githubHeaders() {
  const headers: Record<string, string> = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return headers;
}

function installCommandForGitHub(type: ResourceType, url: string) {
  if (type === "template_repo") return `Use as template or clone ${url}`;
  if (type === "agent_skill") return `Review skill files from ${url}`;
  if (type === "mcp_server") return `Review MCP configuration from ${url}`;
  if (type === "github_plugin") return `Review GitHub App or Action integration from ${url}`;
  return `Review and integrate UI components from ${url}`;
}

function getUseCasesForType(type: ResourceType) {
  const useCases: Record<ResourceType, string[]> = {
    agent_skill: ["规范 Agent 工作流", "沉淀可复用开发方法"],
    mcp_server: ["连接外部系统和上下文", "增强 Agent 工具调用能力"],
    github_plugin: ["增强 GitHub 协作流程", "辅助 PR、Issue 或代码评审"],
    ui_component: ["快速搭建产品界面", "复用 UI 组件和交互动效"],
    template_repo: ["作为项目脚手架", "参考目录结构和工程配置"]
  };
  return useCases[type];
}

function extractTags(text: string) {
  const tokens = text.toLowerCase().match(/[a-z][a-z0-9-]{2,}/g) ?? [];
  return Array.from(new Set(tokens.filter((token) => !["and", "for", "from", "more", "server", "model", "context", "protocol", "run", "apps"].includes(token)))).slice(0, 10);
}

function normalizeRepositoryUrl(value: string) {
  if (value.startsWith("git+https://")) return value.slice(4).replace(/\.git$/, "");
  if (value.startsWith("git+ssh://git@github.com/")) return `https://github.com/${value.slice("git+ssh://git@github.com/".length).replace(/\.git$/, "")}`;
  return value;
}
