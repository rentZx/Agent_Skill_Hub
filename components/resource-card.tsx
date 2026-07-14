import Link from "next/link";
import type { ComponentType } from "react";
import {
  ArrowUpRight,
  Boxes,
  BrainCircuit,
  DatabaseZap,
  GitPullRequestArrow,
  WandSparkles
} from "lucide-react";
import type { Resource, ResourceType, RiskLevel } from "@/lib/types";
import { riskLabels, typeLabels } from "@/lib/resource-types";

const riskClassNames: Record<RiskLevel, string> = {
  low: "border-emerald-300/30 bg-emerald-300/[0.12] text-emerald-100",
  medium: "border-amber-300/30 bg-amber-300/[0.12] text-amber-100",
  high: "border-rose-300/30 bg-rose-300/[0.12] text-rose-100"
};

const typeIcons: Record<ResourceType, ComponentType<{ className?: string }>> = {
  agent_skill: BrainCircuit,
  mcp_server: DatabaseZap,
  github_plugin: GitPullRequestArrow,
  ui_component: WandSparkles,
  template_repo: Boxes
};

export function ResourceCard({ resource }: { resource: Resource }) {
  const Icon = typeIcons[resource.type];

  return (
    <article className="group flex min-h-[340px] flex-col rounded-lg border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.032))] p-4 shadow-glass backdrop-blur-xl transition duration-300 ease-out hover:-translate-y-1 hover:border-cyan-300/35 hover:bg-white/[0.07] hover:shadow-[0_18px_46px_rgba(34,211,238,0.10)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-md border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-xs font-medium text-cyan-100">
            <Icon className="h-3.5 w-3.5" />
            {typeLabels[resource.type]}
          </div>
          <h3 className="mt-3 text-lg font-semibold leading-6 text-slate-50">{resource.name}</h3>
        </div>
        <span className={`shrink-0 rounded-md border px-2.5 py-1 text-xs font-medium uppercase tracking-[0.08em] ${riskClassNames[resource.risk_level]}`}>
          {riskLabels[resource.risk_level]}
        </span>
      </div>

      <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">{resource.description}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {resource.tags.slice(0, 4).map((tag) => (
          <span key={tag} className="rounded-md border border-white/10 bg-black/20 px-2 py-1 text-xs text-muted-foreground">
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Score label="可信度" value={resource.trust_score} tone="neutral" />
        <Score label="适配度" value={resource.fit_score} tone="accent" />
      </div>

      <div className="mt-4 rounded-md border border-cyan-300/15 bg-black/30 p-3">
        <div className="text-xs font-medium text-slate-300">安装方式</div>
        <code className="mt-1 block truncate text-xs leading-5 text-cyan-100">{resource.install_command}</code>
      </div>

      <div className="mt-4 line-clamp-1 text-xs text-muted-foreground">支持工具：{resource.supported_agents.join(", ")}</div>

      <div className="mt-auto flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs text-muted-foreground">更新于 {resource.last_updated}</span>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <Link
            href={`/resources/${resource.slug}`}
            className="inline-flex items-center justify-center rounded-md border border-white/10 px-2.5 py-2 text-xs text-slate-200 transition hover:border-cyan-300/40 hover:bg-cyan-300/10"
          >
            详情
          </Link>
          <Link
            href={resource.repo_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-1 rounded-md border border-white/10 px-2.5 py-2 text-xs text-cyan-100 transition hover:border-cyan-300/40 hover:bg-cyan-300/10"
          >
            来源 <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function Score({ label, value, tone }: { label: string; value: number; tone: "neutral" | "accent" }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/20 p-3">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={tone === "accent" ? "font-semibold text-cyan-100" : "font-semibold text-slate-100"}>{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10">
        <div
          className={tone === "accent"
            ? "h-1.5 rounded-full bg-gradient-to-r from-cyan-300 via-blue-400 to-violet-400 shadow-[0_0_14px_rgba(34,211,238,0.24)]"
            : "h-1.5 rounded-full bg-gradient-to-r from-slate-300 to-cyan-200"}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
