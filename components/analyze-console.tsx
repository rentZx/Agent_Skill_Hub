"use client";

import { useEffect, useState } from "react";
import { Clipboard, GitBranch, Layers3, Radar, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { analyzeProject } from "@/lib/project-analyzer";
import { getRiskReason } from "@/lib/risk";
import type { Resource } from "@/lib/types";

export function AnalyzeConsole({ resources }: { resources: Resource[] }) {
  const [input, setInput] = useState("我要开发一个画室管理系统");
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState(() => analyzeProject(input, resources));
  const [source, setSource] = useState<"deepseek" | "rules">("rules");
  const [discoveredCount, setDiscoveredCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function requestAnalysis(value: string) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: value })
      });
      const payload = (await response.json()) as { ok: boolean; result?: typeof result & { source: "deepseek" | "rules"; discoveredCount: number }; error?: string };
      if (!response.ok || !payload.ok || !payload.result) throw new Error(payload.error ?? "分析失败");
      setResult(payload.result);
      setSource(payload.result.source);
      setDiscoveredCount(payload.result.discoveredCount ?? 0);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "分析失败");
    } finally {
      setLoading(false);
    }
  }

  function runAnalysis() {
    return requestAnalysis(input);
  }

  useEffect(() => {
    const prompt = new URLSearchParams(window.location.search).get("prompt")?.trim();
    if (!prompt) return;
    setInput(prompt);
    void requestAnalysis(prompt);
    // The query string is the one-time handoff from the home page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function copyPrompt() {
    await navigator.clipboard.writeText(result.recommendation.codexPrompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="space-y-6 pb-10">
      <section className="relative overflow-hidden rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(6,12,26,0.96),rgba(14,23,48,0.82)_50%,rgba(39,24,88,0.68))] p-5 shadow-glass sm:p-7">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
        <div className="relative grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100"><Sparkles className="h-3.5 w-3.5" />Project Analyzer</div>
            <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">把一句需求变成可执行架构</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">规则引擎会分析项目行业、类型、用户和技术约束，并从本地资源库生成开发路线与 Codex Prompt。</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row lg:w-auto">
            <Button onClick={runAnalysis} disabled={loading} className="w-full lg:w-auto"><Sparkles className="h-4 w-4" />{loading ? "分析中..." : "开始分析"}</Button>
            <Button onClick={copyPrompt} variant={copied ? "secondary" : "default"} className="w-full lg:w-auto"><Clipboard className="h-4 w-4" />{copied ? "已复制" : "复制 Codex Prompt"}</Button>
          </div>
          <textarea value={input} onChange={(event) => setInput(event.target.value)} rows={4} className="min-h-28 w-full resize-none rounded-md border border-white/10 bg-white/[0.05] p-4 text-base leading-7 text-slate-100 outline-none focus:border-cyan-300/40 lg:col-span-2" placeholder="例如：我要开发一个跨境获客平台" />
          <div className="text-xs text-muted-foreground lg:col-span-2">{error ? error : source === "deepseek" ? `DeepSeek 智能分析已启用，本次联网发现 ${discoveredCount} 个 GitHub 候选` : "当前使用规则引擎"}</div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <Panel title="项目分析" icon={Radar}>
          <Info label="行业" value={result.analysis.industry} /><Info label="项目类型" value={result.analysis.projectType} /><Info label="平台" value={result.analysis.platform} /><Info label="目标用户" value={result.analysis.targetUsers} /><Info label="复杂度" value={result.analysis.difficulty} />
          <Info label="主要功能" value={result.analysis.coreFeatures.join("、")} />
          <div className="flex flex-wrap gap-2 pt-1">{result.analysis.tags.map((tag) => <span key={tag} className="rounded-md border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-xs text-cyan-100">{tag}</span>)}</div>
        </Panel>
        <Panel title="推荐技术栈" icon={Layers3}>
          <Info label="Frontend" value={result.analysis.frontend} /><Info label="Backend" value={result.analysis.backend} /><Info label="Database" value={result.analysis.database} /><Info label="ORM" value={result.analysis.orm} /><Info label="Deploy" value={result.analysis.deploy} />
        </Panel>
      </section>

      <Panel title="开发路线" icon={GitBranch}><div className="grid gap-3 sm:grid-cols-2">{result.analysis.roadmap.map((step, index) => <div key={step} className="rounded-md border border-white/10 bg-slate-950/45 p-4"><div className="text-xs text-cyan-200">阶段 {index + 1}</div><div className="mt-2 text-sm text-slate-100">{step}</div></div>)}</div></Panel>
      <section className="grid gap-5 md:grid-cols-2">
        {result.recommendation.groups.filter((group) => group.items.length > 0).map((group) => (
          <Panel key={group.id} title={presentationTitle(group.id)} icon={Layers3}>
            <div className="grid gap-2">
              {group.items.map((item) => <div key={item.resource.id} className="rounded-md border border-white/10 bg-slate-950/45 p-3"><div className="flex items-center justify-between gap-3"><span className="text-sm font-medium text-slate-100">{item.resource.name}</span><span className="text-xs text-cyan-200">适配度 {Math.round(item.score)}</span></div><div className="mt-2 flex flex-wrap gap-2 text-[11px]"><span className="rounded border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-cyan-100">{matchKindLabels[item.matchKind]}</span><span className="rounded border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-cyan-100">可信度 {item.resource.trust_score}</span><span className={`rounded border px-2 py-1 ${riskClassName[item.resource.risk_level]}`}>风险 {item.resource.risk_level}</span><span className="rounded border border-white/10 px-2 py-1 text-slate-400">基础适配 {item.resource.fit_score}</span></div><div className="mt-2 text-xs leading-5 text-muted-foreground">{item.why}</div><div className="mt-1 text-[11px] leading-5 text-amber-100/80">风险依据：{getRiskReason(item.resource)}</div></div>)}
            </div>
          </Panel>
        ))}
      </section>
      <section className="rounded-lg border border-cyan-300/25 bg-slate-950/60 p-5 shadow-focus-glow"><div className="mb-3 text-sm font-medium text-cyan-100">推荐资源与 Codex Prompt</div><div className="mb-4 text-sm text-muted-foreground">已从资源库与 GitHub 匹配 {result.recommendation.groups.reduce((sum, group) => sum + group.items.length, 0)} 项 Skills、MCP、GitHub 插件、UI 和模板。</div><pre className="max-h-[520px] overflow-auto whitespace-pre-wrap rounded-md border border-white/10 bg-black/30 p-4 text-sm leading-7 text-slate-200">{result.recommendation.codexPrompt}</pre></section>
    </div>
  );
}

function presentationTitle(id: string) {
  const titles: Record<string, string> = { "required-skills": "推荐 Skills", "mcp-servers": "推荐 MCP", "github-plugins": "推荐 GitHub", "ui-libraries": "推荐 UI", "template-repos": "推荐 Template", "optional-enhancements": "可选增强", "risk-alerts": "高风险候选" };
  return titles[id] ?? "推荐资源";
}

const riskClassName = {
  low: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
  medium: "border-amber-300/25 bg-amber-300/10 text-amber-100",
  high: "border-rose-300/25 bg-rose-300/10 text-rose-100"
};

const matchKindLabels = { domain: "领域匹配", baseline: "基础能力", risk: "风险候选" };

function Panel({ title, icon: Icon, children }: { title: string; icon: typeof Radar; children: React.ReactNode }) {
  return <section className="rounded-lg border border-white/10 bg-white/[0.035] p-5"><div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-100"><Icon className="h-4 w-4 text-cyan-200" />{title}</div><div className="grid gap-3 text-sm leading-6">{children}</div></section>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="grid gap-1 border-b border-white/10 pb-3 last:border-b-0 sm:grid-cols-[7rem_1fr]"><span className="text-xs text-muted-foreground">{label}</span><span className="text-slate-100">{value}</span></div>;
}
