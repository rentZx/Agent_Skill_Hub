import Link from "next/link";
import type { ComponentType } from "react";
import {
  ArrowRight,
  Boxes,
  BrainCircuit,
  ClipboardList,
  DatabaseZap,
  GitPullRequestArrow,
  Radar,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  WandSparkles
} from "lucide-react";
import type { ResourceType } from "@/lib/types";
import { typeLabels } from "@/lib/resource-types";
import { getResources } from "@/lib/resources";
import { Button } from "@/components/ui/button";

const typeIcons: Record<ResourceType, ComponentType<{ className?: string }>> = {
  agent_skill: BrainCircuit,
  mcp_server: DatabaseZap,
  github_plugin: GitPullRequestArrow,
  ui_component: WandSparkles,
  template_repo: Boxes
};

export default async function HomePage() {
  const resources = await getResources();
  const totalResources = resources.length;
  const avgTrust = Math.round(resources.reduce((sum, item) => sum + item.trust_score, 0) / totalResources);
  const avgFit = Math.round(resources.reduce((sum, item) => sum + item.fit_score, 0) / totalResources);
  const lowRisk = resources.filter((item) => item.risk_level === "low").length;
  const topResources = [...resources]
    .sort((a, b) => b.fit_score + b.trust_score - (a.fit_score + a.trust_score))
    .slice(0, 6);

  return (
    <div className="space-y-8 pb-10">
      <section className="relative overflow-hidden rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(6,12,26,0.96),rgba(14,23,48,0.82)_44%,rgba(39,24,88,0.68))] px-4 py-5 shadow-glass sm:px-6 sm:py-7 lg:px-8">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_18%_10%,rgba(34,211,238,0.24),transparent_34%),radial-gradient(ellipse_at_82%_20%,rgba(139,92,246,0.22),transparent_38%),linear-gradient(90deg,rgba(103,232,249,0.08)_1px,transparent_1px),linear-gradient(rgba(103,232,249,0.06)_1px,transparent_1px)] bg-[size:auto,auto,42px_42px,42px_42px]" />

        <div className="relative grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-md border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100">
              <Sparkles className="h-3.5 w-3.5" />
              AI 能力选型与插件导航平台
            </div>

            <div className="space-y-4">
              <h1 className="max-w-4xl text-4xl font-semibold leading-tight text-balance sm:text-5xl lg:text-6xl">
                输入项目需求，自动推荐 AI 开发能力组合。
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-300">
                Agent Skill Hub 会根据项目描述，推荐可复用的 Skills、MCP Servers、GitHub 插件、UI 组件库和模板仓库，并给出适配度、可信度和风险提示。
              </p>
            </div>

            <div className="rounded-lg border border-cyan-300/25 bg-slate-950/68 p-2 shadow-[0_0_48px_rgba(34,211,238,0.18)] backdrop-blur-xl">
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <Link
                  href="/recommend"
                  className="group flex min-h-20 items-start gap-3 rounded-md border border-white/10 bg-white/[0.055] p-4 transition hover:border-cyan-300/35 hover:bg-white/[0.075]"
                >
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
                    <ClipboardList className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-slate-100">粘贴项目需求，生成能力组合方案</span>
                    <span className="mt-1 block text-sm leading-6 text-slate-400">
                      示例：做一个能推荐 Codex Skills、MCP Servers 和 UI 模板的 AI SaaS...
                    </span>
                  </span>
                </Link>
                <Button asChild size="lg" className="h-full min-h-14 shrink-0 px-5">
                  <Link href="/recommend">
                    生成方案 <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 px-1 text-xs text-slate-400">
                <span className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1">需求理解</span>
                <span className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1">资源组合</span>
                <span className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1">风险说明</span>
                <span className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1">Codex 提示词</span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Signal label="资源总数" value={totalResources.toString()} />
              <Signal label="平均可信度" value={`${avgTrust}/100`} />
              <Signal label="低风险资源" value={lowRisk.toString()} />
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-lg border border-white/10 bg-white/[0.055] p-5 shadow-[0_0_36px_rgba(99,102,241,0.10)] backdrop-blur-xl">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">能力雷达</div>
                  <div className="mt-1 text-lg font-semibold">V1.0 覆盖图谱</div>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-md border border-cyan-300/20 bg-cyan-300/10 text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.14)]">
                  <Radar className="h-5 w-5" />
                </div>
              </div>
              <div className="space-y-4">
                <RadarRow label="Agent Skills" value={92} />
                <RadarRow label="MCP 接入" value={89} />
                <RadarRow label="GitHub 插件" value={82} />
                <RadarRow label="UI 组件" value={88} />
                <RadarRow label="模板适配" value={84} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <GlassTile icon={TerminalSquare} label="Codex 可交接" value="生成可复制开发提示词" />
              <GlassTile icon={ShieldCheck} label="风险可见" value={`平均适配度 ${avgFit}/100`} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-5">
        {Object.entries(typeLabels).map(([type, label]) => {
          const Icon = typeIcons[type as ResourceType];
          const count = resources.filter((resource) => resource.type === type).length;
          return (
            <Link
              key={type}
              href="/resources"
              className="group rounded-lg border border-white/10 bg-white/[0.045] p-4 transition duration-300 hover:-translate-y-0.5 hover:border-cyan-300/30 hover:bg-white/[0.07] hover:shadow-[0_14px_36px_rgba(34,211,238,0.08)]"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-slate-950/60 text-cyan-100 group-hover:border-cyan-300/30">
                <Icon className="h-4 w-4" />
              </div>
              <div className="mt-4 text-sm font-medium">{label}</div>
              <div className="mt-1 text-2xl font-semibold">{count}</div>
            </Link>
          );
        })}
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.75fr_1.25fr]">
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">工作方式</div>
          <h2 className="mt-3 text-2xl font-semibold">从项目想法到 Codex 可执行方案。</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            当前版本使用精选本地资源库，优先展示适配度、可信度和风险等级，让资源比较更快、更清楚。
          </p>
          <Button asChild variant="secondary" className="mt-5">
            <Link href="/resources">
              查看全部资源 <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {topResources.map((resource) => (
            <article
              key={resource.name}
              className="rounded-lg border border-white/10 bg-white/[0.045] p-4 transition duration-300 hover:-translate-y-0.5 hover:border-cyan-300/30 hover:bg-white/[0.07] hover:shadow-[0_14px_36px_rgba(34,211,238,0.08)]"
            >
              <div className="text-xs text-cyan-200">{typeLabels[resource.type]}</div>
              <h3 className="mt-2 min-h-12 text-base font-semibold leading-6">{resource.name}</h3>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{resource.description}</p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <span className="rounded-md border border-white/10 bg-black/20 px-2 py-1 text-slate-300">可信 {resource.trust_score}</span>
                <span className="rounded-md border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-cyan-100">适配 {resource.fit_score}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function Signal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function RadarRow({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-white/10">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-cyan-300 via-blue-400 to-violet-400 shadow-[0_0_18px_rgba(103,232,249,0.22)]"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function GlassTile({
  icon: Icon,
  label,
  value
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
      <Icon className="h-4 w-4 text-cyan-200" />
      <div className="mt-3 text-sm font-medium">{label}</div>
      <div className="mt-1 text-xs text-muted-foreground">{value}</div>
    </div>
  );
}
