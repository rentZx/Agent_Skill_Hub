import { NextResponse } from "next/server";
import { inferRiskLevel } from "@/lib/github-import";

type GitHubSearchResponse = {
  items?: Array<{
    name: string;
    full_name: string;
    html_url: string;
    description: string | null;
    stargazers_count: number;
    forks_count: number;
    language: string | null;
    topics?: string[];
    license: { spdx_id: string | null; name: string } | null;
    archived: boolean;
    pushed_at: string | null;
  }>;
};

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim();
  if (!query) return NextResponse.json({ ok: false, error: "缺少 GitHub 搜索关键词。" }, { status: 400 });

  const headers: HeadersInit = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const response = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=20`, { headers, cache: "no-store" });
  if (!response.ok) return NextResponse.json({ ok: false, error: `GitHub API request failed: ${response.status}` }, { status: response.status });
  const payload = (await response.json()) as GitHubSearchResponse;

  return NextResponse.json({
    ok: true,
    items: (payload.items ?? []).map((item) => ({
      name: item.name,
      fullName: item.full_name,
      url: item.html_url,
      description: item.description,
      stars: item.stargazers_count,
      forks: item.forks_count,
      language: item.language,
      topics: item.topics ?? [],
      license: item.license?.spdx_id ?? item.license?.name ?? null,
      risk: inferRiskLevel({ stars: item.stargazers_count, license: item.license?.spdx_id ?? null, latestCommitTime: item.pushed_at, archived: item.archived })
    }))
  });
}
