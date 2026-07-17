import { NextResponse } from "next/server";
import {
  buildChineseSummary,
  buildUseCases,
  inferInstallCommand,
  inferResourceType,
  assessRiskLevel,
  parseGitHubRepoUrl
} from "@/lib/github-import";

type GitHubRepo = {
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  license: { spdx_id: string; name: string } | null;
  topics?: string[];
  default_branch: string;
  archived: boolean;
  pushed_at: string | null;
};

type GitHubContent = {
  content?: string;
  encoding?: string;
};

type GitHubCommit = {
  commit?: {
    committer?: {
      date?: string;
    };
  };
};

export async function POST(request: Request) {
  let payload: { url?: string };
  try {
    payload = (await request.json()) as { url?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "请求体不是有效 JSON。" }, { status: 400 });
  }

  const { url } = payload;
  const parsed = url ? parseGitHubRepoUrl(url) : null;

  if (!parsed) {
    return NextResponse.json({ ok: false, error: "请输入有效的 GitHub 仓库 URL，例如 https://github.com/owner/repo。" }, { status: 400 });
  }

  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const repo = await githubFetch<GitHubRepo>(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`, headers);
    const [readme, latestCommit, skillMd, packageJson, mcpJson, serverJson, manifestJson] = await Promise.all([
      fetchReadme(parsed.owner, parsed.repo, headers),
      fetchLatestCommit(parsed.owner, parsed.repo, headers),
      contentExists(parsed.owner, parsed.repo, "SKILL.md", headers),
      fetchPackageJson(parsed.owner, parsed.repo, headers),
      contentExists(parsed.owner, parsed.repo, "mcp.json", headers),
      contentExists(parsed.owner, parsed.repo, "server.json", headers),
      contentExists(parsed.owner, parsed.repo, "manifest.json", headers)
    ]);

    const topics = repo.topics ?? [];
    const hasPackageJson = Boolean(packageJson);
    const hasMcpManifest = mcpJson || serverJson || manifestJson;
    const description = repo.description ?? "";
    const type = inferResourceType({
      name: repo.name,
      description,
      topics,
      readme,
      hasSkillMd: skillMd,
      hasPackageJson,
      hasMcpManifest
    });
    const readme_summary = buildChineseSummary({ name: repo.name, description, type, readme });
    const risk = assessRiskLevel({
      stars: repo.stargazers_count,
      license: repo.license?.spdx_id ?? null,
      latestCommitTime: latestCommit ?? repo.pushed_at,
      archived: repo.archived
    });
    const install_command = inferInstallCommand({
      type,
      packageName: packageJson?.name ?? null,
      repoUrl: repo.html_url,
      hasPackageJson
    });

    return NextResponse.json({
      ok: true,
      resource: {
        name: repo.name,
        type,
        description: readme_summary,
        tags: Array.from(new Set([...topics, type.replace("_", "-")])).slice(0, 12),
        supported_agents: inferSupportedAgents(type, topics, readme),
        install_command,
        use_cases: buildUseCases(type, topics),
        risk_level: risk.level,
        risk_reason: risk.reason,
        trust_score: inferTrustScore(repo.stargazers_count, repo.license?.spdx_id ?? null, risk.level),
        fit_score: inferFitScore(type, topics, skillMd, hasPackageJson, hasMcpManifest),
        repo_url: repo.html_url,
        source: "github_import",
        last_updated: (latestCommit ?? repo.pushed_at ?? new Date().toISOString()).slice(0, 10),
        readme_summary,
        github: {
          owner: parsed.owner,
          repo: parsed.repo,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          license: repo.license?.spdx_id ?? repo.license?.name ?? null,
          latest_commit_time: latestCommit ?? repo.pushed_at,
          topics,
          has_skill_md: skillMd,
          has_package_json: hasPackageJson,
          has_mcp_manifest: hasMcpManifest,
          default_branch: repo.default_branch
        }
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "GitHub 解析失败。";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

async function githubFetch<T>(url: string, headers: HeadersInit): Promise<T> {
  const response = await fetch(url, { headers, next: { revalidate: 0 } });
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("未找到该 GitHub 仓库，请检查 URL 或仓库权限。");
    }
    if (response.status === 403) {
      throw new Error("GitHub API 访问受限，可能触发速率限制。可配置 GITHUB_TOKEN 后重试。");
    }
    throw new Error(`GitHub API 请求失败：${response.status}`);
  }
  return response.json() as Promise<T>;
}

async function fetchReadme(owner: string, repo: string, headers: HeadersInit) {
  try {
    const data = await githubFetch<GitHubContent>(`https://api.github.com/repos/${owner}/${repo}/readme`, headers);
    if (data.encoding === "base64" && data.content) {
      return Buffer.from(data.content, "base64").toString("utf8").slice(0, 12000);
    }
  } catch {
    return "";
  }

  return "";
}

async function fetchLatestCommit(owner: string, repo: string, headers: HeadersInit) {
  try {
    const commits = await githubFetch<GitHubCommit[]>(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`, headers);
    return commits[0]?.commit?.committer?.date ?? null;
  } catch {
    return null;
  }
}

async function contentExists(owner: string, repo: string, path: string, headers: HeadersInit) {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
    headers,
    next: { revalidate: 0 }
  });
  return response.ok;
}

async function fetchPackageJson(owner: string, repo: string, headers: HeadersInit) {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/package.json`, {
    headers,
    next: { revalidate: 0 }
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as GitHubContent;
  if (data.encoding !== "base64" || !data.content) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(data.content, "base64").toString("utf8")) as { name?: string };
  } catch {
    return null;
  }
}

function inferSupportedAgents(type: string, topics: string[], readme: string) {
  const text = `${topics.join(" ")} ${readme}`.toLowerCase();
  const agents = new Set<string>();

  if (type === "agent_skill" || text.includes("codex")) agents.add("Codex");
  if (text.includes("claude")) agents.add("Claude");
  if (type === "mcp_server") {
    agents.add("Codex");
    agents.add("Claude");
    agents.add("Cursor");
  }
  if (type === "ui_component" || type === "template_repo") {
    agents.add("Codex");
    agents.add("Cursor");
  }
  if (type === "github_plugin") agents.add("GitHub");

  return Array.from(agents.size ? agents : new Set(["Codex"]));
}

function inferTrustScore(stars: number, license: string | null, risk: string) {
  const starScore = Math.min(32, Math.floor(Math.log10(Math.max(stars, 1)) * 12));
  const licenseScore = license ? 16 : 0;
  const riskScore = risk === "low" ? 22 : risk === "medium" ? 12 : 4;
  return Math.min(95, 35 + starScore + licenseScore + riskScore);
}

function inferFitScore(type: string, topics: string[], hasSkill: boolean, hasPackage: boolean, hasMcp: boolean) {
  let score = 62;
  if (hasSkill || hasMcp || hasPackage) score += 12;
  if (topics.length > 0) score += 8;
  if (type === "mcp_server" && hasMcp) score += 10;
  if (type === "agent_skill" && hasSkill) score += 10;
  return Math.min(96, score);
}
