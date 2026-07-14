import type { ComponentType, ReactNode } from "react";
import {
  Boxes,
  BrainCircuit,
  DatabaseZap,
  Filter,
  Gauge,
  GitPullRequestArrow,
  Layers3,
  Radar,
  Search,
  ShieldCheck,
  Sparkles,
  WandSparkles
} from "lucide-react";
import type { ResourceType } from "@/lib/types";
import { resourceTypes, typeLabels } from "@/lib/resource-types";
import { getResources } from "@/lib/resources";
import { ResourceCard } from "@/components/resource-card";

const typeIcons: Record<ResourceType, ComponentType<{ className?: string }>> = {
  agent_skill: BrainCircuit,
  mcp_server: DatabaseZap,
  github_plugin: GitPullRequestArrow,
  ui_component: WandSparkles,
  template_repo: Boxes
};

export default async function ResourcesPage() {
  const resources = await getResources();
  const totalResources = resources.length;
  const averageTrust = Math.round(
    resources.reduce((sum, resource) => sum + resource.trust_score, 0) / totalResources
  );
  const averageFit = Math.round(
    resources.reduce((sum, resource) => sum + resource.fit_score, 0) / totalResources
  );
  const lowRiskCount = resources.filter((resource) => resource.risk_level === "low").length;

  return (
    <div className="space-y-7 pb-10">
      <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="relative overflow-hidden rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(8,13,28,0.92),rgba(14,23,48,0.78)_52%,rgba(31,20,70,0.55))] p-5 shadow-glass sm:p-6 lg:p-7">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(103,232,249,0.07)_1px,transparent_1px),linear-gradient(rgba(103,232,249,0.05)_1px,transparent_1px)] bg-[size:42px_42px]" />
          <div className="relative">
          <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100">
            <Sparkles className="h-3.5 w-3.5" />
            V1.0 精选能力资源库
          </div>
          <h1 className="max-w-3xl text-3xl font-semibold leading-tight text-balance sm:text-4xl lg:text-5xl">
            面向 AI Agent 项目的资源雷达。
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">
            这里汇总 Skills、MCP Servers、GitHub 插件、UI 组件库和模板仓库，用适配度、可信度和风险等级帮助你快速选型。
          </p>
          <div className="mt-5 rounded-lg border border-cyan-300/20 bg-slate-950/58 p-2 shadow-focus-glow backdrop-blur-xl">
            <div className="flex min-h-12 items-center gap-3 rounded-md border border-white/10 bg-white/[0.04] px-3">
              <Search className="h-4 w-4 shrink-0 text-cyan-200" />
              <span className="text-sm text-slate-300">
                可搜索方向：文档解析、网页抓取、GitHub MCP、Playwright MCP、shadcn/ui、Supabase...
              </span>
            </div>
          </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <MetricCard icon={<Layers3 className="h-4 w-4" />} label="资源总数" value={totalResources.toString()} />
          <MetricCard icon={<ShieldCheck className="h-4 w-4" />} label="平均可信度" value={`${averageTrust}/100`} />
          <MetricCard icon={<Gauge className="h-4 w-4" />} label="平均适配度" value={`${averageFit}/100`} />
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-5">
        {resourceTypes.map((type) => {
          const count = resources.filter((resource) => resource.type === type).length;
          const Icon = typeIcons[type];
          return (
            <div key={type} className="group rounded-lg border border-white/10 bg-white/[0.04] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-cyan-300/30 hover:bg-white/[0.065]">
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-slate-950/60 text-cyan-100">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="text-2xl font-semibold">{count}</div>
              </div>
              <div className="mt-4 text-xs uppercase tracking-[0.16em] text-muted-foreground">{typeLabels[type]}</div>
            </div>
          );
        })}
      </section>

      <section className="space-y-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-muted-foreground">
              <Radar className="h-3.5 w-3.5 text-cyan-200" />
              能力清单
            </div>
            <h2 className="mt-3 text-2xl font-semibold">精选资源</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              当前有 {lowRiskCount} 个低风险条目，适合用于 V1.0 项目规划和组合推荐。
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            来源：本地精选种子数据
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {resources.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="glass-panel rounded-lg p-5 transition duration-200 hover:border-cyan-300/25">
      <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-md border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
        {icon}
      </div>
      <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}
