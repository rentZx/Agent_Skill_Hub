import { inferRiskLevel } from "./github-import";
import type { Resource, ResourceType } from "./types";

type GitHubSearchItem = {
  full_name: string;
  name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  topics?: string[];
  language: string | null;
  license: { spdx_id: string | null } | null;
  archived: boolean;
  pushed_at: string | null;
};

export async function discoverGitHubResources(input: string, tags: string[], existing: Resource[]): Promise<Resource[]> {
  const queries = buildQueries(input, tags);
  const results = await Promise.all(queries.map((query) => searchRepositories(query)));
  const existingUrls = new Set(existing.map((resource) => resource.repo_url).filter(Boolean));
  const unique = new Map<string, GitHubSearchItem>();

  results.flat().forEach((item) => {
    if (!existingUrls.has(item.html_url)) unique.set(item.full_name, item);
  });

  return Array.from(unique.values()).slice(0, 24).map((item) => toResource(item, tags));
}

export async function discoverTopAiResources(limit = 30): Promise<Resource[]> {
  const queries = [
    "AI plugin in:name,description,readme archived:false fork:false",
    "MCP AI in:name,description,readme archived:false fork:false",
    "agent skill AI in:name,description,readme archived:false fork:false",
    "LLM extension in:name,description,readme archived:false fork:false"
  ];
  const results = await Promise.all(queries.map((query) => searchRepositories(query, 100)));
  const unique = new Map<string, GitHubSearchItem>();
  results.flat().filter(isAiPluginLike).forEach((item) => unique.set(item.full_name, item));
  return Array.from(unique.values())
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, limit)
    .map((item) => ({ ...toResource(item, ["ai", "github", "plugin"]), source: "github_top_ai" }));
}

function buildQueries(input: string, tags: string[]) {
  const cleanTags = tags
    .map((tag) => tag.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim())
    .filter((tag) => tag.length > 2)
    .slice(0, 5);
  const queryText = cleanTags.join(" ");
  return Array.from(new Set([
    `${queryText} ${input.match(/[a-z0-9-]{3,}/gi)?.slice(0, 2).join(" ") ?? ""}`.trim(),
    `${queryText} dashboard`.trim(),
    `${queryText} template OR starter OR mcp`.trim()
  ])).filter(Boolean).slice(0, 3);
}

async function searchRepositories(query: string, perPage = 8): Promise<GitHubSearchItem[]> {
  const headers: HeadersInit = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const response = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${perPage}`, { headers, cache: "no-store" });
  if (!response.ok) {
    console.warn(`GitHub discovery failed for query ${query}: ${response.status}`);
    return [];
  }
  const payload = (await response.json()) as { items?: GitHubSearchItem[] };
  return payload.items ?? [];
}

function isAiPluginLike(item: GitHubSearchItem) {
  const text = `${item.name} ${item.description ?? ""} ${(item.topics ?? []).join(" ")}`.toLowerCase();
  const ai = /(artificial intelligence|\bai\b|llm|mcp|agent|copilot|claude|openai|gemini|rag|embedding)/i.test(text);
  const plugin = /(plugin|extension|skill|mcp|agent|tool|component|template|starter|integration|action)/i.test(text);
  return ai && plugin && !item.archived;
}

function toResource(item: GitHubSearchItem, projectTags: string[]): Resource {
  const text = `${item.name} ${item.description ?? ""} ${(item.topics ?? []).join(" ")}`.toLowerCase();
  const type = inferDiscoveredType(text);
  const risk = inferRiskLevel({ stars: item.stargazers_count, license: item.license?.spdx_id ?? null, latestCommitTime: item.pushed_at, archived: item.archived });
  const tags = Array.from(new Set([...(item.topics ?? []), ...projectTags.map((tag) => tag.toLowerCase()), type.replace("_", "-")])).slice(0, 18);

  return {
    id: `github-${item.full_name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    slug: `github-${item.full_name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    name: item.name,
    type,
    description: item.description ?? `${item.name} GitHub repository`,
    tags,
    supported_agents: type === "mcp_server" ? ["Codex", "Claude", "Cursor"] : ["Codex"],
    install_command: `Review and integrate from ${item.html_url}`,
    use_cases: ["GitHub-discovered project resource", ...(item.language ? [`${item.language} project`] : [])],
    risk_level: risk,
    trust_score: calculateTrust(item.stargazers_count, item.license?.spdx_id ?? null, risk),
    fit_score: Math.min(92, 55 + Math.min(25, Math.floor(Math.log10(Math.max(item.stargazers_count, 1)) * 8)) + (item.topics?.length ? 8 : 0)),
    repo_url: item.html_url,
    github_stars: item.stargazers_count,
    github_forks: item.forks_count,
    license: item.license?.spdx_id ?? null,
    latest_commit_at: item.pushed_at,
    readme_summary: item.description ?? `${item.name} GitHub repository`,
    source: "github_live",
    last_updated: (item.pushed_at ?? new Date().toISOString()).slice(0, 10)
  };
}

function inferDiscoveredType(text: string): ResourceType {
  if (text.includes("mcp") || text.includes("model-context-protocol")) return "mcp_server";
  if (text.includes("skill.md") || text.includes("agent skill") || text.includes("codex skill")) return "agent_skill";
  if (text.includes("github action") || text.includes("github app") || text.includes("pull request")) return "github_plugin";
  if (text.includes("ui") || text.includes("component") || text.includes("shadcn") || text.includes("tailwind")) return "ui_component";
  return "template_repo";
}

function calculateTrust(stars: number, license: string | null, risk: string) {
  const starScore = Math.min(32, Math.floor(Math.log10(Math.max(stars, 1)) * 12));
  return Math.min(95, 35 + starScore + (license ? 16 : 0) + (risk === "low" ? 22 : risk === "medium" ? 12 : 4));
}
