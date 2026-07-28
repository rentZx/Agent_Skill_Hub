"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bookmark, ChevronLeft, ChevronRight, Filter, Search, SlidersHorizontal, X } from "lucide-react";
import { ResourceCard } from "@/components/resource-card";
import { Button } from "@/components/ui/button";
import type { ResourceSort } from "@/lib/resource-filters";
import { resourceTypes, riskLabels, typeLabels } from "@/lib/resource-types";
import type { Resource, ResourceType, RiskLevel } from "@/lib/types";
import { cn } from "@/lib/utils";

const riskLevels: RiskLevel[] = ["low", "medium", "high"];
const favoritesKey = "agent-skill-hub:favorites";

type SearchFilters = {
  query: string;
  type: ResourceType | "all";
  tag: string;
  risk: RiskLevel | "all";
  sort: ResourceSort;
};

export function SearchConsole({
  resources,
  tags,
  filters,
  totalResults,
  totalResources,
  page,
  pageCount
}: {
  resources: Resource[];
  tags: string[];
  filters: SearchFilters;
  totalResults: number;
  totalResources: number;
  page: number;
  pageCount: number;
}) {
  const [query, setQuery] = useState(filters.query);
  const [type, setType] = useState<ResourceType | "all">(filters.type);
  const [tag, setTag] = useState(filters.tag);
  const [risk, setRisk] = useState<RiskLevel | "all">(filters.risk);
  const [sort, setSort] = useState<ResourceSort>(filters.sort);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  useEffect(() => {
    const stored = window.localStorage.getItem(favoritesKey);
    if (stored) {
      setFavoriteIds(JSON.parse(stored) as string[]);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(favoritesKey, JSON.stringify(favoriteIds));
  }, [favoriteIds]);

  const activeFilterCount = [
    filters.query,
    filters.type !== "all",
    filters.tag !== "all",
    filters.risk !== "all",
    filters.sort !== "relevance"
  ].filter(Boolean).length;

  function toggleFavorite(resourceId: string) {
    setFavoriteIds((current) =>
      current.includes(resourceId) ? current.filter((id) => id !== resourceId) : [...current, resourceId]
    );
  }

  return (
    <div className="space-y-7 pb-10">
      <form action="/search" method="get" className="space-y-7">
        <section className="relative overflow-hidden rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(8,13,28,0.94),rgba(14,23,48,0.80)_52%,rgba(39,24,88,0.58))] p-5 shadow-glass sm:p-6 lg:p-7">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(103,232,249,0.07)_1px,transparent_1px),linear-gradient(rgba(103,232,249,0.05)_1px,transparent_1px)] bg-[size:42px_42px]" />
          <div className="relative">
            <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              智能搜索控制台
            </div>
            <h1 className="max-w-3xl text-3xl font-semibold leading-tight text-balance sm:text-4xl lg:text-5xl">
              按关键词、类型、标签和风险快速筛选资源。
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">
              支持中文和英文关键词搜索，并结合名称、标签、用途和资源说明计算相关度。
            </p>

            <div className="mt-6 rounded-lg border border-cyan-300/20 bg-slate-950/60 p-2 shadow-focus-glow backdrop-blur-xl">
              <label className="flex min-h-12 items-center gap-3 rounded-md border border-white/10 bg-white/[0.045] px-3 transition focus-within:border-cyan-300/40">
                <Search className="h-4 w-4 shrink-0 text-cyan-200" />
                <input
                  name="query"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="输入资源需求：菜谱、股票行情、2D 转 3D、库存语音查询..."
                  className="min-w-0 flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
                />
              </label>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-white/10 bg-white/[0.035] p-3 shadow-glass">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <SelectField
              name="type"
              label="类型"
              value={type}
              onChange={(value) => setType(value as ResourceType | "all")}
              options={[
                ["all", "全部类型"],
                ...resourceTypes.map((resourceType) => [resourceType, typeLabels[resourceType]] as const)
              ]}
            />
            <SelectField
              name="tag"
              label="热门标签"
              value={tag}
              onChange={setTag}
              options={[["all", "全部标签"], ...tags.map((item) => [item, item] as const)]}
            />
            <SelectField
              name="risk"
              label="风险"
              value={risk}
              onChange={(value) => setRisk(value as RiskLevel | "all")}
              options={[
                ["all", "全部风险等级"],
                ...riskLevels.map((riskLevel) => [riskLevel, riskLabels[riskLevel]] as const)
              ]}
            />
            <SelectField
              name="sort"
              label="排序"
              value={sort}
              onChange={(value) => setSort(value as ResourceSort)}
              options={[
                ["relevance", "相关度"],
                ["trust", "可信度"],
                ["latest", "最近更新"],
                ["stars", "GitHub Stars"]
              ]}
            />
          </div>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-slate-950/45 px-3 py-2 text-xs text-muted-foreground">
              <Filter className="h-3.5 w-3.5 text-cyan-200" />
              已启用筛选：{activeFilterCount}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <Button asChild type="button" variant="secondary">
                <Link href="/search">
                  <X className="h-4 w-4" />
                  重置
                </Link>
              </Button>
              <Button type="submit">
                <Search className="h-4 w-4" />
                搜索
              </Button>
            </div>
          </div>
        </section>
      </form>

      <section className="space-y-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <h2 className="text-2xl font-semibold">搜索结果</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              共匹配 {totalResults} / {totalResources} 个资源，当前第 {page} / {pageCount} 页。收藏会保存在当前浏览器。
            </p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-muted-foreground">
            已收藏：{favoriteIds.length}
          </div>
        </div>

        {resources.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {resources.map((resource) => {
            const isFavorite = favoriteIds.includes(resource.id);
            return (
              <ResourceCard
                key={resource.id}
                resource={resource}
                headerAction={(
                  <button
                    type="button"
                    onClick={() => toggleFavorite(resource.id)}
                    aria-label={isFavorite ? "取消收藏" : "收藏资源"}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-md border shadow-[0_10px_24px_rgba(0,0,0,0.22)] transition",
                      isFavorite
                        ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-100"
                        : "border-white/10 bg-slate-950/70 text-muted-foreground hover:border-cyan-300/30 hover:text-cyan-100"
                    )}
                  >
                    <Bookmark className={cn("h-4 w-4", isFavorite && "fill-current")} />
                  </button>
                )}
              />
            );
          })}
          </div>
        ) : (
          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-6 text-center">
            <div className="text-base font-medium text-slate-100">本地资源库暂时没有强匹配结果</div>
            <p className="mt-2 text-sm text-muted-foreground">可以减少筛选条件，或进入项目分析进行数据库与 GitHub 联合检索。</p>
            <Button asChild className="mt-4">
              <Link href={`/analyze?prompt=${encodeURIComponent(filters.query)}`}>使用项目分析继续检索</Link>
            </Button>
          </div>
        )}

        {pageCount > 1 ? (
          <nav className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-3" aria-label="搜索结果分页">
            <Link
              href={page > 1 ? buildSearchHref(filters, page - 1) : buildSearchHref(filters, 1)}
              aria-disabled={page === 1}
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-3 py-2 text-xs transition",
                page === 1
                  ? "pointer-events-none border-white/5 text-slate-600"
                  : "border-white/10 text-slate-200 hover:border-cyan-300/35 hover:bg-cyan-300/10"
              )}
            >
              <ChevronLeft className="h-4 w-4" />
              上一页
            </Link>
            <span className="text-xs text-muted-foreground">第 {page} / {pageCount} 页</span>
            <Link
              href={page < pageCount ? buildSearchHref(filters, page + 1) : buildSearchHref(filters, pageCount)}
              aria-disabled={page === pageCount}
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-3 py-2 text-xs transition",
                page === pageCount
                  ? "pointer-events-none border-white/5 text-slate-600"
                  : "border-white/10 text-slate-200 hover:border-cyan-300/35 hover:bg-cyan-300/10"
              )}
            >
              下一页
              <ChevronRight className="h-4 w-4" />
            </Link>
          </nav>
        ) : null}
      </section>
    </div>
  );
}

function SelectField({
  name,
  label,
  value,
  onChange,
  options
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly (readonly [string, string])[];
}) {
  return (
    <label className="rounded-md border border-white/10 bg-slate-950/45 p-3">
      <span className="mb-2 block text-xs font-medium text-muted-foreground">{label}</span>
      <select
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-md border border-white/10 bg-slate-950/80 px-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/40"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function buildSearchHref(filters: SearchFilters, page: number) {
  const params = new URLSearchParams();
  if (filters.query) params.set("query", filters.query);
  if (filters.type !== "all") params.set("type", filters.type);
  if (filters.tag !== "all") params.set("tag", filters.tag);
  if (filters.risk !== "all") params.set("risk", filters.risk);
  if (filters.sort !== "relevance") params.set("sort", filters.sort);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/search?${query}` : "/search";
}
