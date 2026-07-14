"use client";

import { useEffect, useMemo, useState } from "react";
import { Bookmark, Filter, Search, SlidersHorizontal, X } from "lucide-react";
import { ResourceCard } from "@/components/resource-card";
import { Button } from "@/components/ui/button";
import { filterResources } from "@/lib/resource-filters";
import { resourceTypes, riskLabels, typeLabels } from "@/lib/resource-types";
import type { Resource, ResourceType, RiskLevel } from "@/lib/types";
import { cn } from "@/lib/utils";

const riskLevels: RiskLevel[] = ["low", "medium", "high"];
const favoritesKey = "agent-skill-hub:favorites";

export function SearchConsole({ resources, tags }: { resources: Resource[]; tags: string[] }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<ResourceType | "all">("all");
  const [tag, setTag] = useState("all");
  const [risk, setRisk] = useState<RiskLevel | "all">("all");
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

  const filteredResources = useMemo(
    () => filterResources(resources, { query, type, tag, risk }),
    [resources, query, type, tag, risk]
  );

  const activeFilterCount = [query.trim(), type !== "all", tag !== "all", risk !== "all"].filter(Boolean).length;

  function toggleFavorite(resourceId: string) {
    setFavoriteIds((current) =>
      current.includes(resourceId) ? current.filter((id) => id !== resourceId) : [...current, resourceId]
    );
  }

  function resetFilters() {
    setQuery("");
    setType("all");
    setTag("all");
    setRisk("all");
  }

  return (
    <div className="space-y-7 pb-10">
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
            支持中文和英文关键词搜索。比如“文档解析”可匹配 pdf/document，“科技风”可匹配 shadcn/motion，“网页抓取”可匹配 Firecrawl/browser。
          </p>

          <div className="mt-6 rounded-lg border border-cyan-300/20 bg-slate-950/60 p-2 shadow-focus-glow backdrop-blur-xl">
            <label className="flex min-h-12 items-center gap-3 rounded-md border border-white/10 bg-white/[0.045] px-3 transition focus-within:border-cyan-300/40">
              <Search className="h-4 w-4 shrink-0 text-cyan-200" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="输入资源需求：文档解析、科技风界面、网页抓取、GitHub MCP、pgvector..."
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
              />
            </label>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-white/10 bg-white/[0.035] p-3 shadow-glass">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[0.9fr_1.05fr_0.85fr_auto_auto] xl:items-end">
        <SelectField
          label="类型"
          value={type}
          onChange={(value) => setType(value as ResourceType | "all")}
          options={[
            ["all", "全部类型"],
            ...resourceTypes.map((resourceType) => [resourceType, typeLabels[resourceType]] as const)
          ]}
        />
        <SelectField
          label="标签"
          value={tag}
          onChange={setTag}
          options={[["all", "全部标签"], ...tags.map((item) => [item, item] as const)]}
        />
        <SelectField
          label="风险"
          value={risk}
          onChange={(value) => setRisk(value as RiskLevel | "all")}
          options={[
            ["all", "全部风险等级"],
            ...riskLevels.map((riskLevel) => [riskLevel, riskLabels[riskLevel]] as const)
          ]}
        />
        <div className="rounded-md border border-white/10 bg-slate-950/45 p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Filter className="h-3.5 w-3.5 text-cyan-200" />
            已启用筛选
          </div>
          <div className="mt-1 text-xl font-semibold">{activeFilterCount}</div>
        </div>
        <Button variant="secondary" className="min-h-11 self-stretch xl:min-w-28" onClick={resetFilters}>
          <X className="h-4 w-4" />
          重置
        </Button>
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <h2 className="text-2xl font-semibold">搜索结果</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              当前显示 {filteredResources.length} / {resources.length} 个资源。收藏会保存在当前浏览器。
            </p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-muted-foreground">
            已收藏：{favoriteIds.length}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredResources.map((resource) => {
            const isFavorite = favoriteIds.includes(resource.id);
            return (
              <div key={resource.id} className="relative">
                <button
                  type="button"
                  onClick={() => toggleFavorite(resource.id)}
                  aria-label={isFavorite ? "取消收藏" : "收藏资源"}
                  className={cn(
                    "absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-md border shadow-[0_10px_24px_rgba(0,0,0,0.22)] transition",
                    isFavorite
                      ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-100"
                      : "border-white/10 bg-slate-950/70 text-muted-foreground hover:border-cyan-300/30 hover:text-cyan-100"
                  )}
                >
                  <Bookmark className={cn("h-4 w-4", isFavorite && "fill-current")} />
                </button>
                <ResourceCard resource={resource} />
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly (readonly [string, string])[];
}) {
  return (
    <label className="rounded-md border border-white/10 bg-slate-950/45 p-3">
      <span className="mb-2 block text-xs font-medium text-muted-foreground">{label}</span>
      <select
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
