import { assessRiskLevel } from "./github-import";
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

type DiscoveryProfile = {
  queries: string[];
  repositories: string[];
  relevanceTerms: string[];
  typeOverrides: Record<string, ResourceType>;
  tagOverrides: Record<string, string[]>;
};

const stockDiscoveryProfile: DiscoveryProfile = {
  queries: [
    "\"stock analysis\" \"market data\" in:name,description,readme archived:false fork:false",
    "\"A-share\" \"financial data\" in:name,description,readme archived:false fork:false",
    "\"quantitative trading\" backtesting in:name,description,readme archived:false fork:false",
    "\"financial charts\" library in:name,description,readme archived:false fork:false"
  ],
  repositories: [
    "ZhuLinsen/daily_stock_analysis",
    "akfamily/akshare",
    "mootdx/mootdx",
    "microsoft/qlib",
    "ricequant/rqalpha",
    "hsliuping/TradingAgents-CN",
    "tradingview/lightweight-charts"
  ],
  relevanceTerms: [
    "stock analysis", "stock market", "market data", "financial data", "real-time quotes", "a-share",
    "technical analysis", "quantitative trading", "backtesting", "trading strategy", "financial charts"
  ],
  typeOverrides: {
    "zhulinsen/daily_stock_analysis": "agent_skill",
    "tradingview/lightweight-charts": "ui_component"
  },
  tagOverrides: {
    "zhulinsen/daily_stock_analysis": ["stock-market", "market-data", "real-time-quotes", "technical-analysis", "quantitative-trading", "agent-skill"],
    "akfamily/akshare": ["financial-data", "a-share", "market-data", "stock-market"],
    "mootdx/mootdx": ["market-data", "real-time-quotes", "a-share", "tongdaxin"],
    "microsoft/qlib": ["quantitative-trading", "quant-research", "machine-learning", "backtesting"],
    "ricequant/rqalpha": ["backtesting", "algorithmic-trading", "a-share", "trading-strategy"],
    "hsliuping/tradingagents-cn": ["multi-agent-research", "stock-analysis", "quantitative-trading", "stock-market"],
    "tradingview/lightweight-charts": ["financial-charts", "candlestick", "ui", "stock-market"]
  }
};

export async function discoverGitHubResources(input: string, tags: string[], existing: Resource[]): Promise<Resource[]> {
  const profile = getDiscoveryProfile(input, tags);
  const queries = profile?.queries ?? buildQueries(input, tags);
  const [initialResults, preferredResults] = await Promise.all([
    Promise.all(queries.map((query) => searchRepositories(query))),
    Promise.all((profile?.repositories ?? []).map((repository) => fetchRepository(repository)))
  ]);
  let results = initialResults;
  if (results.flat().length === 0) {
    const fallbackQuery = buildFallbackQuery(input, tags);
    if (fallbackQuery && !queries.includes(fallbackQuery)) {
      results = [...results, await searchRepositories(fallbackQuery, 12)];
    }
  }
  const existingUrls = new Set(existing.map((resource) => resource.repo_url).filter(Boolean));
  const preferredNames = new Set((profile?.repositories ?? []).map((repository) => repository.toLowerCase()));
  const unique = new Map<string, GitHubSearchItem>();

  results.flat().forEach((item) => {
    if (!existingUrls.has(item.html_url) || preferredNames.has(item.full_name.toLowerCase())) {
      unique.set(item.full_name.toLowerCase(), item);
    }
  });
  preferredResults.filter((item): item is GitHubSearchItem => Boolean(item)).forEach((item) => {
    unique.set(item.full_name.toLowerCase(), item);
  });

  const relevanceTerms = Array.from(new Set([
    ...getDiscoveryTerms(input, tags),
    ...(profile?.relevanceTerms ?? [])
  ]));
  return Array.from(unique.values())
    .sort((left, right) =>
      scoreRepositoryRelevance(right, relevanceTerms, preferredNames) -
      scoreRepositoryRelevance(left, relevanceTerms, preferredNames)
    )
    .slice(0, 24)
    .map((item) => {
      const key = item.full_name.toLowerCase();
      return toResource(item, tags, {
        typeOverride: profile?.typeOverrides[key],
        tagOverrides: profile?.tagOverrides[key]
      });
    });
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
  const focusedTags = getDiscoveryTerms(input, tags).slice(0, 5);
  const inputTerms = input.match(/[a-z0-9][a-z0-9-]{1,}/gi)?.map((term) => term.toLowerCase()) ?? [];
  const focusedQueries = focusedTags.map(
    (tag) => `${quoteSearchTerm(tag)} in:name,description,readme archived:false fork:false`
  );
  const inputQuery = inputTerms.length > 0
    ? `${inputTerms.slice(0, 4).map(quoteSearchTerm).join(" ")} in:name,description,readme archived:false fork:false`
    : "";

  return Array.from(new Set([...focusedQueries, inputQuery])).filter(Boolean).slice(0, 6);
}

function buildFallbackQuery(input: string, tags: string[]) {
  return getDiscoveryTerms(input, tags).slice(0, 3).map(quoteSearchTerm).join(" ");
}

async function searchRepositories(query: string, perPage = 15): Promise<GitHubSearchItem[]> {
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

async function fetchRepository(fullName: string): Promise<GitHubSearchItem | null> {
  const headers: HeadersInit = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const repositoryPath = fullName.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(`https://api.github.com/repos/${repositoryPath}`, { headers, cache: "no-store" });
  if (!response.ok) {
    console.warn(`GitHub discovery failed for repository ${fullName}: ${response.status}`);
    return null;
  }
  return await response.json() as GitHubSearchItem;
}

function isAiPluginLike(item: GitHubSearchItem) {
  const text = `${item.name} ${item.description ?? ""} ${(item.topics ?? []).join(" ")}`.toLowerCase();
  const ai = /(artificial intelligence|\bai\b|llm|mcp|agent|copilot|claude|openai|gemini|rag|embedding)/i.test(text);
  const plugin = /(plugin|extension|skill|mcp|agent|tool|component|template|starter|integration|action)/i.test(text);
  return ai && plugin && !item.archived;
}

function toResource(
  item: GitHubSearchItem,
  projectTags: string[],
  overrides: { typeOverride?: ResourceType; tagOverrides?: string[] } = {}
): Resource {
  const text = `${item.name} ${item.description ?? ""} ${(item.topics ?? []).join(" ")}`.toLowerCase();
  const type = overrides.typeOverride ?? inferDiscoveredType(text);
  const risk = assessRiskLevel({ stars: item.stargazers_count, license: item.license?.spdx_id ?? null, latestCommitTime: item.pushed_at, archived: item.archived });
  const matchedProjectTags = projectTags
    .map((tag) => tag.toLowerCase())
    .filter((tag) => matchesDiscoveryTerm(text, tag));
  const tags = Array.from(new Set([
    ...(overrides.tagOverrides ?? []),
    ...(item.topics ?? []),
    ...matchedProjectTags,
    type.replace("_", "-")
  ])).slice(0, 18);

  return {
    id: `github-${item.full_name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    slug: `github-${item.full_name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    name: item.name,
    type,
    description: item.description ?? `${item.name} GitHub repository`,
    tags,
    supported_agents: type === "mcp_server" ? ["Codex", "Claude", "Cursor"] : ["Codex"],
    install_command: type === "agent_skill"
      ? `npx skills add ${item.html_url}`
      : `Review and integrate from ${item.html_url}`,
    use_cases: ["GitHub-discovered project resource", ...(item.language ? [`${item.language} project`] : [])],
    risk_level: risk.level,
    risk_reason: risk.reason,
    trust_score: calculateTrust(item.stargazers_count, item.license?.spdx_id ?? null, risk.level),
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
  const has = (pattern: RegExp) => pattern.test(text);
  if (has(/\b(mcp|model-context-protocol)\b/)) return "mcp_server";
  if (has(/\b(skill\.md|agent[- ]skills?|codex[- ]skills?|claude[- ]skills?|claude-code|skills?)\b/)) return "agent_skill";
  if (has(/\b(github action|github app|pull request)\b/)) return "github_plugin";
  if (has(/\b(ui|component|design system|shadcn|tailwind|frontend library|charting library|financial charts?|candlestick charts?|three\.?js|threejs|webgl|react-three-fiber|3d viewer|model viewer)\b/)) return "ui_component";
  return "template_repo";
}

function calculateTrust(stars: number, license: string | null, risk: string) {
  const starScore = Math.min(32, Math.floor(Math.log10(Math.max(stars, 1)) * 12));
  return Math.min(95, 35 + starScore + (license ? 16 : 0) + (risk === "low" ? 22 : risk === "medium" ? 12 : 4));
}

const genericDiscoveryTerms = new Set([
  "web", "web-app", "saas", "dashboard", "postgresql", "postgres", "nextjs", "next.js", "react", "nodejs",
  "typescript", "javascript", "frontend", "backend", "api", "docker", "vercel", "user-upload", "file-export"
]);

function getDiscoveryTerms(input: string, tags: string[]) {
  const tagTerms = tags
    .map((tag) => tag.toLowerCase().replace(/[^a-z0-9\s.-]/g, " ").replace(/\s+/g, " ").trim())
    .filter((tag) => tag.length > 1 && !genericDiscoveryTerms.has(tag));
  const inputTerms = input.match(/[a-z0-9][a-z0-9-]{1,}/gi)?.map((term) => term.toLowerCase()) ?? [];
  return Array.from(new Set([...tagTerms, ...inputTerms])).filter((term) => !genericDiscoveryTerms.has(term));
}

function quoteSearchTerm(term: string) {
  return /[\s-]/.test(term) ? `"${term}"` : term;
}

function scoreRepositoryRelevance(item: GitHubSearchItem, terms: string[], preferredNames = new Set<string>()) {
  const text = `${item.name} ${item.description ?? ""} ${(item.topics ?? []).join(" ")}`.toLowerCase();
  const directHits = terms.filter((term) => matchesDiscoveryTerm(text, term)).length;
  const tokenHits = terms.flatMap((term) => term.split(/[\s-]+/)).filter((term) => term.length > 1 && text.includes(term)).length;
  const popularity = Math.log10(Math.max(item.stargazers_count, 1)) * 4;
  const preferredBoost = preferredNames.has(item.full_name.toLowerCase()) ? 500 : 0;
  return directHits * 45 + tokenHits * 5 + popularity + preferredBoost;
}

function getDiscoveryProfile(input: string, tags: string[]) {
  const source = `${input} ${tags.join(" ")}`.toLowerCase();
  return /(炒股|股票|股市|证券行情|a股|stock.market|stock.trading|financial.data|market.data|quantitative.trading)/i.test(source)
    ? stockDiscoveryProfile
    : null;
}

function matchesDiscoveryTerm(text: string, term: string) {
  const normalizedText = text.replace(/[^a-z0-9]+/g, " ");
  const normalizedTerm = term.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return text.includes(term.toLowerCase()) || (normalizedTerm.length > 1 && normalizedText.includes(normalizedTerm));
}
