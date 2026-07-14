"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Check, Clipboard, Database, FileText, Layers3, Lightbulb, Radar, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildProjectRecommendation } from "@/lib/recommendation";
import type { Resource } from "@/lib/types";

const examplePrompt = "我要开发一个外贸获客系统，可以根据产品和国家筛选目标公司，自动采集官网信息，做背景调查，保存客户线索，并导出 Excel 报告。";

export function RecommendationConsole({ resources }: { resources: Resource[] }) {
  const [projectPrompt, setProjectPrompt] = useState(examplePrompt);
  const [copied, setCopied] = useState(false);

  const recommendation = useMemo(
    () => buildProjectRecommendation(projectPrompt, resources),
    [projectPrompt, resources]
  );

  async function copyPrompt() {
    await navigator.clipboard.writeText(recommendation.codexPrompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="space-y-7 pb-10">
      <section className="relative overflow-hidden rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(8,13,28,0.94),rgba(14,23,48,0.80)_50%,rgba(39,24,88,0.62))] p-5 shadow-glass sm:p-6 lg:p-7">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(103,232,249,0.07)_1px,transparent_1px),linear-gradient(rgba(103,232,249,0.05)_1px,transparent_1px)] bg-[size:42px_42px]" />
        <div className="relative grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100">
              <WandSparkles className="h-3.5 w-3.5" />
              项目开发能力组合方案
            </div>
            <h1 className="max-w-3xl text-3xl font-semibold leading-tight text-balance sm:text-4xl lg:text-5xl">
              把项目描述转成可执行的 Codex 开发组合。
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">
              系统会先理解项目类型、用户、功能、数据来源和技术栈，再按能力模块组合 Skills、MCP Servers、GitHub 插件、UI 组件库和模板仓库。
            </p>
          </div>

          <div className="rounded-lg border border-cyan-300/25 bg-slate-950/64 p-2 shadow-[0_0_44px_rgba(34,211,238,0.16)] backdrop-blur-xl">
            <textarea
              value={projectPrompt}
              onChange={(event) => setProjectPrompt(event.target.value)}
              rows={6}
              className="min-h-40 w-full resize-none rounded-md border border-white/10 bg-white/[0.05] p-4 text-base leading-7 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-300/40"
              placeholder="描述项目、行业、目标用户、核心功能、数据来源、导出方式、UI 或部署要求..."
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-lg border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.032))] p-5 shadow-glass">
          <div className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-muted-foreground">
            <Lightbulb className="h-3.5 w-3.5 text-cyan-200" />
            项目需求理解
          </div>

          <div className="mt-5 grid gap-4 text-sm leading-6">
            <UnderstandingRow label="项目类型" value={recommendation.understanding.projectType} />
            <UnderstandingRow label="目标用户" value={recommendation.understanding.targetUsers} />
            <UnderstandingList label="核心功能" items={recommendation.understanding.coreFeatures} />
            <UnderstandingList label="可能的数据来源" items={recommendation.understanding.dataSources} />
            <UnderstandingList label="推荐技术栈" items={recommendation.understanding.techStack} />
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.032))] p-5 shadow-glass">
          <div className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-muted-foreground">
            <Radar className="h-3.5 w-3.5 text-cyan-200" />
            所需能力模块
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {recommendation.modules.map((module) => (
              <div key={module.id} className="rounded-lg border border-white/10 bg-slate-950/45 p-4 transition duration-300 hover:border-cyan-300/30 hover:bg-white/[0.055]">
                <div className="text-sm font-medium text-slate-100">{module.label}</div>
                <div className="mt-2 text-xs leading-5 text-muted-foreground">{module.description}</div>
                <div className="mt-3 text-xs text-cyan-200">{module.projectStage}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
        <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Database className="h-3.5 w-3.5 text-cyan-200" />
          已识别关键词
        </div>
        <div className="flex flex-wrap gap-2">
          {recommendation.keywords.length > 0 ? (
            recommendation.keywords.map((keyword) => (
              <span key={keyword} className="rounded-md border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1.5 text-xs text-cyan-100">
                {keyword}
              </span>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">输入更具体的项目描述后会显示关键词。</span>
          )}
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-muted-foreground">
              <FileText className="h-3.5 w-3.5 text-cyan-200" />
              方案报告
            </div>
            <h2 className="mt-3 text-2xl font-semibold">推荐资源组合</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              每个资源都绑定到开发环节，并标出安装方式、风险等级和替代方案。
            </p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-muted-foreground">
            已扫描资源：{resources.length}
          </div>
        </div>

        <div className="grid gap-5">
          {recommendation.groups.map((group) => (
            <div key={group.id} className="rounded-lg border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.052),rgba(255,255,255,0.030))] p-5 shadow-glass">
              <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-50">{group.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{group.description}</p>
                </div>
                <span className="w-fit rounded-md border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-xs text-cyan-100">
                  匹配 {group.items.length} 个
                </span>
              </div>

              {group.items.length > 0 ? (
                <div className="grid gap-3 xl:grid-cols-2">
                  {group.items.map((item) => (
                    <article key={item.resource.id} className="rounded-lg border border-white/10 bg-slate-950/48 p-4 transition duration-300 hover:-translate-y-0.5 hover:border-cyan-300/30 hover:bg-white/[0.055] hover:shadow-[0_14px_34px_rgba(34,211,238,0.08)]">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold">{item.resource.name}</div>
                          <div className="mt-1 text-xs text-cyan-200">方案适配度 {Math.round(item.score)}</div>
                        </div>
                        <span className={`rounded-md border px-2 py-1 text-xs ${riskClassName[item.risk]}`}>
                          {item.risk}
                        </span>
                      </div>
                      <div className="mt-4 grid gap-2 text-sm leading-6 text-muted-foreground">
                        <ResourceDetail label="为什么推荐" value={item.why} />
                        <ResourceDetail label="使用环节" value={item.stage} />
                        <ResourceDetail label="安装方式" value={item.install} code />
                        <ResourceDetail label="替代方案" value={item.alternative} />
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-md border border-amber-300/20 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100">
                  {group.gap}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {recommendation.gaps.length > 0 && (
        <section className="rounded-lg border border-amber-300/20 bg-amber-300/10 p-5">
          <div className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-amber-100">
            <AlertTriangle className="h-4 w-4" />
            明确缺口
          </div>
          <div className="grid gap-2 text-sm leading-6 text-amber-50/85">
            {recommendation.gaps.map((gap) => (
              <div key={gap}>{gap}</div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-lg border border-cyan-300/25 bg-[linear-gradient(180deg,rgba(15,23,42,0.86),rgba(2,6,23,0.72))] p-5 shadow-focus-glow">
        <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-muted-foreground">
              <Layers3 className="h-3.5 w-3.5 text-cyan-200" />
              Codex 交接提示词
            </div>
            <h2 className="mt-3 text-2xl font-semibold">可复制给 Codex 的开发提示词</h2>
          </div>
          <Button onClick={copyPrompt} variant={copied ? "secondary" : "default"} className="w-full md:w-auto">
            {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
            {copied ? "已复制" : "复制提示词"}
          </Button>
        </div>
        <pre className="max-h-[560px] overflow-auto whitespace-pre-wrap rounded-lg border border-cyan-300/15 bg-black/45 p-4 text-sm leading-7 text-slate-200 thin-scrollbar">
          {recommendation.codexPrompt}
        </pre>
      </section>
    </div>
  );
}

const riskClassName = {
  low: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
  medium: "border-amber-300/25 bg-amber-300/10 text-amber-100",
  high: "border-rose-300/25 bg-rose-300/10 text-rose-100"
};

function UnderstandingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b border-white/10 pb-3 last:border-b-0 last:pb-0 sm:grid-cols-[8rem_1fr]">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-slate-100">{value}</div>
    </div>
  );
}

function UnderstandingList({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="grid gap-2 border-b border-white/10 pb-3 last:border-b-0 last:pb-0 sm:grid-cols-[8rem_1fr]">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item} className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-slate-200">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function ResourceDetail({ label, value, code = false }: { label: string; value: string; code?: boolean }) {
  return (
    <p>
      <span className="text-slate-300">{label}：</span>
      {code ? <code className="break-words text-cyan-100">{value}</code> : value}
    </p>
  );
}
