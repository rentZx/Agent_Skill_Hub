"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Clipboard,
  GitBranch,
  Layers3,
  Radar,
  Search,
  Settings,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  llmProviderDefinitions,
  type LlmProvider
} from "@/lib/llm-config";
import {
  canTransmitApiKey,
  getActiveLlmConfig,
  LLM_SETTINGS_CHANGED_EVENT,
  openLlmSettings
} from "@/lib/llm-settings";
import type { AnalyzerResult } from "@/lib/project-analyzer";
import { getRiskReason } from "@/lib/risk";

export function AnalyzeConsole({
  initialInput,
  initialResult
}: {
  initialInput: string;
  initialResult: AnalyzerResult;
}) {
  const [input, setInput] = useState(initialInput);
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState(initialResult);
  const [source, setSource] = useState<LlmProvider | null>(null);
  const [activeProvider, setActiveProvider] = useState<LlmProvider | null>(null);
  const [discoveredCount, setDiscoveredCount] = useState(0);
  const [selectedDiscoveredCount, setSelectedDiscoveredCount] = useState(0);
  const [selectedCatalogCount, setSelectedCatalogCount] = useState(0);
  const [modelStatus, setModelStatus] = useState<"completed" | "fallback">("completed");
  const [loading, setLoading] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [error, setError] = useState("");

  const requestAnalysis = useCallback(async (value: string) => {
    const projectInput = value.trim();
    if (!projectInput) {
      setError("请输入项目需求。");
      return;
    }
    const llm = getActiveLlmConfig();
    if (!llm) {
      setActiveProvider(null);
      setError("请先配置大模型 API Key，再开始项目分析。");
      openLlmSettings();
      return;
    }
    if (!canTransmitApiKey()) {
      setError("当前站点未启用 HTTPS。为保护 API Key，暂不能进行项目分析。");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: projectInput, llm })
      });
      const payload = (await response.json()) as {
        ok: boolean;
        result?: typeof result & {
          source: LlmProvider;
          discoveredCount: number;
          selectedDiscoveredCount: number;
          selectedCatalogCount: number;
          modelStatus: "completed" | "fallback";
        };
        error?: string;
      };
      if (!response.ok || !payload.ok || !payload.result) throw new Error(payload.error ?? "分析失败");
      setResult(payload.result);
      setSource(payload.result.source);
      setActiveProvider(payload.result.source);
      setDiscoveredCount(payload.result.discoveredCount ?? 0);
      setSelectedDiscoveredCount(payload.result.selectedDiscoveredCount ?? 0);
      setSelectedCatalogCount(payload.result.selectedCatalogCount ?? 0);
      setModelStatus(payload.result.modelStatus ?? "completed");
      setHasAnalyzed(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "分析失败");
    } finally {
      setLoading(false);
    }
  }, []);

  function runAnalysis() {
    return requestAnalysis(input);
  }

  useEffect(() => {
    function refreshProvider() {
      setActiveProvider(getActiveLlmConfig()?.provider ?? null);
    }
    refreshProvider();
    window.addEventListener(LLM_SETTINGS_CHANGED_EVENT, refreshProvider);

    const prompt = new URLSearchParams(window.location.search).get("prompt")?.trim();
    if (prompt) {
      setInput(prompt);
      if (getActiveLlmConfig() && canTransmitApiKey()) {
        void requestAnalysis(prompt);
      }
    }
    return () => window.removeEventListener(LLM_SETTINGS_CHANGED_EVENT, refreshProvider);
  }, [requestAnalysis]);

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
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">使用你配置的大模型识别需求、技术约束和信息缺口，再从本地资源库与 GitHub 生成候选方案。</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row lg:w-auto">
            <Button onClick={runAnalysis} disabled={loading} className="w-full lg:w-auto">
              {activeProvider ? <Sparkles className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
              {loading ? "分析中..." : activeProvider ? "开始分析" : "配置模型后分析"}
            </Button>
            <Button onClick={copyPrompt} disabled={!hasAnalyzed} variant={copied ? "secondary" : "default"} className="w-full lg:w-auto"><Clipboard className="h-4 w-4" />{copied ? "已复制" : result.recommendation.clarity.confidence === "low" ? "复制需求澄清 Prompt" : "复制 Codex Prompt"}</Button>
          </div>
          <textarea value={input} onChange={(event) => setInput(event.target.value)} maxLength={2000} rows={4} className="min-h-28 w-full resize-none rounded-md border border-white/10 bg-white/[0.05] p-4 text-base leading-7 text-slate-100 outline-none focus:border-cyan-300/40 lg:col-span-2" placeholder="例如：我要开发一个跨境获客平台" />
          <div className="text-xs text-muted-foreground lg:col-span-2">
            {error
              ? error
              : source
                ? modelStatus === "fallback"
                  ? `${llmProviderDefinitions[source].shortLabel} 暂未返回可用分析，已使用规则引擎与资源库生成方案：采用 ${selectedDiscoveredCount} 个联网资源和 ${selectedCatalogCount} 个资源库条目。`
                  : `${llmProviderDefinitions[source].shortLabel} 已完成需求分析：GitHub 候选池中 ${discoveredCount} 个通过验证，方案采用 ${selectedDiscoveredCount} 个联网资源和 ${selectedCatalogCount} 个资源库条目。`
                : activeProvider
                  ? `已配置 ${llmProviderDefinitions[activeProvider].shortLabel}，输入需求后开始分析。`
                  : "尚未配置大模型。你仍可使用资源库和搜索功能。"}
          </div>
        </div>
      </section>

      {!hasAnalyzed ? (
        <section className="rounded-lg border border-white/10 bg-white/[0.035] p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <Settings className="mt-0.5 h-5 w-5 shrink-0 text-cyan-200" />
            <div>
              <h2 className="text-sm font-medium text-slate-100">
                {activeProvider ? "等待项目分析" : "项目分析需要你自己的大模型 API Key"}
              </h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {activeProvider
                  ? "输入完整项目需求后开始分析；模型配置只保存在当前浏览器。"
                  : "未配置模型时，平台不会使用站点方 Key，也不会生成需求分析；资源搜索功能仍可正常使用。"}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {!activeProvider ? (
                  <Button type="button" size="sm" onClick={openLlmSettings}>
                    <Settings className="h-4 w-4" />打开模型设置
                  </Button>
                ) : null}
                <Button asChild type="button" size="sm" variant="secondary">
                  <Link href={`/search${input.trim() ? `?query=${encodeURIComponent(input.trim())}` : ""}`}>
                    <Search className="h-4 w-4" />搜索现有资源
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <div className={hasAnalyzed ? "contents" : "hidden"}>
      {result.recommendation.clarity.confidence === "low" ? (
        <section className="border-y border-amber-300/25 bg-amber-300/[0.06] px-4 py-4 text-sm text-amber-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-200" />
            <div>
              <div className="font-medium">需求信息不足，当前结果仅用于方向调研</div>
              <div className="mt-1 text-xs leading-5 text-amber-100/75">{result.recommendation.clarity.summary}</div>
              <div className="mt-2 text-xs leading-5 text-amber-100/90">{result.recommendation.clarity.clarifyingQuestions.join("；")}</div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <Panel title="项目分析" icon={Radar}>
          <Info label="需求置信度" value={confidenceLabel(result.recommendation.clarity.confidence)} /><Info label="行业" value={result.analysis.industry} /><Info label="项目类型" value={result.analysis.projectType} /><Info label="平台" value={result.analysis.platform} /><Info label="目标用户" value={result.analysis.targetUsers} /><Info label="复杂度" value={result.analysis.difficulty} />
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
              {group.items.map((item) => <div key={item.resource.id} className="rounded-md border border-white/10 bg-slate-950/45 p-3"><div className="flex items-center justify-between gap-3"><span className="text-sm font-medium text-slate-100">{item.resource.name}</span><span className="text-xs text-cyan-200">适配度 {Math.round(item.score)}</span></div><div className="mt-2 flex flex-wrap gap-2 text-[11px]"><span className="rounded border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-cyan-100">{matchKindLabels[item.matchKind]}</span><span className="rounded border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-cyan-100">可信度 {item.resource.trust_score}</span><span className={`rounded border px-2 py-1 ${riskClassName[item.resource.risk_level]}`}>风险 {item.resource.risk_level}</span><span className="rounded border border-white/10 px-2 py-1 text-slate-400">资源基础质量 {item.resource.fit_score}</span></div><div className="mt-2 text-xs leading-5 text-muted-foreground">{item.why}</div><div className="mt-1 text-[11px] leading-5 text-amber-100/80">风险依据：{getRiskReason(item.resource)}</div></div>)}
            </div>
          </Panel>
        ))}
      </section>
      <section className="rounded-lg border border-cyan-300/25 bg-slate-950/60 p-5 shadow-focus-glow"><div className="mb-3 text-sm font-medium text-cyan-100">{result.recommendation.clarity.confidence === "low" ? "候选资源与需求澄清 Prompt" : "推荐资源与 Codex Prompt"}</div><div className="mb-4 text-sm text-muted-foreground">已从资源库与 GitHub 匹配 {result.recommendation.groups.reduce((sum, group) => sum + group.items.length, 0)} 项经验证候选资源。</div><pre className="max-h-[520px] overflow-auto whitespace-pre-wrap rounded-md border border-white/10 bg-black/30 p-4 text-sm leading-7 text-slate-200">{result.recommendation.codexPrompt}</pre></section>
      </div>
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

function confidenceLabel(confidence: "low" | "medium" | "high") {
  return confidence === "high" ? "高" : confidence === "medium" ? "中" : "低，需先澄清";
}

function Panel({ title, icon: Icon, children }: { title: string; icon: typeof Radar; children: React.ReactNode }) {
  return <section className="rounded-lg border border-white/10 bg-white/[0.035] p-5"><div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-100"><Icon className="h-4 w-4 text-cyan-200" />{title}</div><div className="grid gap-3 text-sm leading-6">{children}</div></section>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="grid gap-1 border-b border-white/10 pb-3 last:border-b-0 sm:grid-cols-[7rem_1fr]"><span className="text-xs text-muted-foreground">{label}</span><span className="text-slate-100">{value}</span></div>;
}
