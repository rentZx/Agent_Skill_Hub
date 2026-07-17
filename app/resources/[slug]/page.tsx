import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, ArrowUpRight, CheckCircle2, ShieldCheck, Terminal, XCircle } from "lucide-react";
import { riskLabels, typeLabels } from "@/lib/resource-types";
import { getRiskReason } from "@/lib/risk";
import { getResourceBySlug, getResources } from "@/lib/resources";
import { Button } from "@/components/ui/button";
import type { RiskLevel } from "@/lib/types";

export async function generateStaticParams() {
  const resources = await getResources();
  return resources.map((resource) => ({ slug: resource.slug }));
}

export default async function ResourceDetailPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const resource = await getResourceBySlug(slug);

  if (!resource) {
    notFound();
  }

  const related = (await getResources())
    .filter((item) => item.id !== resource.id && (item.type === resource.type || item.tags.some((tag) => resource.tags.includes(tag))))
    .slice(0, 4);

  return (
    <div className="space-y-6 pb-10">
      <Button asChild variant="ghost" className="px-0">
        <Link href="/resources">
          <ArrowLeft className="h-4 w-4" />
          返回资源库
        </Link>
      </Button>

      <section className="relative overflow-hidden rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(8,13,28,0.94),rgba(14,23,48,0.82)_52%,rgba(39,24,88,0.62))] p-5 shadow-glass sm:p-7">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_18%_0%,rgba(34,211,238,0.18),transparent_36%),linear-gradient(90deg,rgba(103,232,249,0.06)_1px,transparent_1px),linear-gradient(rgba(103,232,249,0.05)_1px,transparent_1px)] bg-[size:auto,42px_42px,42px_42px]" />
        <div className="relative">
          <div className="flex flex-wrap gap-2">
            <div className="inline-flex rounded-md border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100">
              {typeLabels[resource.type]}
            </div>
            <div className={`inline-flex rounded-md border px-3 py-1 text-xs font-medium uppercase tracking-[0.08em] ${riskClassName[resource.risk_level]}`}>
              {riskLabels[resource.risk_level]}
            </div>
          </div>
          <h1 className="mt-4 max-w-4xl text-3xl font-semibold leading-tight text-balance sm:text-5xl">{resource.name}</h1>
          <p className="mt-4 max-w-4xl text-base leading-7 text-muted-foreground">{resource.description}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {resource.tags.map((tag) => (
              <span key={tag} className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <div className="space-y-4">
          <Panel icon={<Terminal className="h-4 w-4" />} title="安装命令">
            <div className="rounded-lg border border-cyan-300/20 bg-black/45 p-4 shadow-[0_0_24px_rgba(34,211,238,0.08)]">
              <div className="mb-2 text-xs font-medium text-cyan-100">复制到项目接入流程中使用</div>
              <code className="block overflow-x-auto whitespace-pre rounded-md border border-white/10 bg-slate-950/85 p-4 text-sm leading-6 text-cyan-100 thin-scrollbar">
                {resource.install_command}
              </code>
            </div>
          </Panel>

          <Panel icon={<CheckCircle2 className="h-4 w-4" />} title="适用场景">
            <div className="grid gap-2">
              {resource.use_cases.map((item) => (
                <div key={item} className="rounded-md border border-emerald-300/15 bg-emerald-300/[0.06] p-3 text-sm leading-6 text-slate-200">
                  {item}
                </div>
              ))}
            </div>
          </Panel>

          <Panel icon={<XCircle className="h-4 w-4" />} title="不适用场景">
            <div className="grid gap-2">
              {getNonUseCases(resource.type).map((item) => (
                <div key={item} className="rounded-md border border-rose-300/15 bg-rose-300/[0.055] p-3 text-sm leading-6 text-muted-foreground">
                  {item}
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel icon={<ShieldCheck className="h-4 w-4" />} title="风险与适配">
            <div className="grid gap-3">
              <Metric label="风险等级" value={riskLabels[resource.risk_level]} highlight={riskClassName[resource.risk_level]} />
              <Metric label="可信度" value={`${resource.trust_score}/100`} />
              <Metric label="适配度" value={`${resource.fit_score}/100`} accent />
              <Metric label="支持工具" value={resource.supported_agents.join(", ")} />
            </div>
            <div className="mt-4 rounded-md border border-amber-300/20 bg-amber-300/10 p-3 text-sm leading-6 text-amber-50/90">
              <div className="mb-1 flex items-center gap-2 font-medium text-amber-100">
                <AlertTriangle className="h-4 w-4" />
                风险说明
              </div>
              {getRiskReason(resource)}
            </div>
            <Button asChild variant="secondary" className="mt-4">
              <Link href={resource.repo_url} target="_blank" rel="noreferrer">
                打开来源 <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </Panel>

          <Panel title="推荐搭配资源">
            <div className="grid gap-2">
              {related.map((item) => (
                <Link
                  key={item.id}
                  href={`/resources/${item.slug}`}
                className="rounded-md border border-white/10 bg-slate-950/45 p-3 transition duration-300 hover:-translate-y-0.5 hover:border-cyan-300/30 hover:bg-white/[0.055]"
                >
                  <div className="text-sm font-medium">{item.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{typeLabels[item.type]}</div>
                </Link>
              ))}
            </div>
          </Panel>
        </div>
      </section>
    </div>
  );
}

function Panel({ icon, title, children }: { icon?: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.052),rgba(255,255,255,0.030))] p-5 shadow-glass">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
        {icon ? <span className="text-cyan-200">{icon}</span> : null}
        {title}
      </div>
      {children}
    </div>
  );
}

function Metric({ label, value, accent = false, highlight }: { label: string; value: string; accent?: boolean; highlight?: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-slate-950/45 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 w-fit rounded-md px-0 text-sm font-medium ${highlight ?? (accent ? "text-cyan-100" : "text-slate-100")}`}>{value}</div>
    </div>
  );
}

const riskClassName: Record<RiskLevel, string> = {
  low: "border-emerald-300/30 bg-emerald-300/[0.12] text-emerald-100",
  medium: "border-amber-300/30 bg-amber-300/[0.12] text-amber-100",
  high: "border-rose-300/30 bg-rose-300/[0.12] text-rose-100"
};

function getNonUseCases(type: string) {
  const common = "不适合在没有验证来源、许可证或维护状态前直接进入生产环境。";
  const byType: Record<string, string[]> = {
    agent_skill: ["不适合作为运行时代码依赖，它更适合约束 Agent 工作方式。", common],
    mcp_server: ["不适合在权限边界不清楚时接入真实账号或生产数据。", common],
    github_plugin: ["不适合替代人工代码评审和 CI 质量门禁。", common],
    ui_component: ["不适合直接整套复制到既有设计系统而不做视觉收敛。", common],
    template_repo: ["不适合在不理解目录结构和依赖取舍时作为最终架构。", common]
  };

  return byType[type] ?? [common];
}
