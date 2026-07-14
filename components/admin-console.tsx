"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Check, Database, GitBranch, Loader2, Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resourceTypes, typeLabels } from "@/lib/resource-types";
import type { Resource, ResourceType, RiskLevel } from "@/lib/types";
import type { GitHubParsedResource, GitHubParseResponse } from "@/lib/github-import";

type DraftResource = {
  name: string;
  type: ResourceType;
  description: string;
  tags: string;
  supported_agents: string;
  install_command: string;
  use_cases: string;
  risk_level: RiskLevel;
  trust_score: string;
  fit_score: string;
  repo_url: string;
};

const adminDraftKey = "agent-skill-hub:admin-drafts";

const emptyDraft: DraftResource = {
  name: "",
  type: "agent_skill",
  description: "",
  tags: "",
  supported_agents: "Codex",
  install_command: "",
  use_cases: "",
  risk_level: "medium",
  trust_score: "70",
  fit_score: "70",
  repo_url: ""
};

export function AdminConsole({ resources, tags }: { resources: Resource[]; tags: string[] }) {
  const [draft, setDraft] = useState<DraftResource>(emptyDraft);
  const [savedCount, setSavedCount] = useState(0);
  const [githubUrl, setGithubUrl] = useState("");
  const [parsedResource, setParsedResource] = useState<GitHubParsedResource | null>(null);
  const [importStatus, setImportStatus] = useState<"idle" | "parsing" | "saving" | "saved" | "error">("idle");
  const [importMessage, setImportMessage] = useState("");

  const resourcesByType = useMemo(
    () =>
      resourceTypes.map((type) => ({
        type,
        count: resources.filter((resource) => resource.type === type).length
      })),
    [resources]
  );

  function updateDraft<K extends keyof DraftResource>(key: K, value: DraftResource[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function saveDraft() {
    const stored = window.localStorage.getItem(adminDraftKey);
    const current = stored ? (JSON.parse(stored) as DraftResource[]) : [];
    window.localStorage.setItem(adminDraftKey, JSON.stringify([...current, draft]));
    setSavedCount((count) => count + 1);
    setDraft(emptyDraft);
  }

  async function parseGitHubResource() {
    setImportStatus("parsing");
    setImportMessage("");
    setParsedResource(null);

    try {
      const response = await fetch("/api/github/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: githubUrl })
      });
      const result = (await response.json()) as GitHubParseResponse;

      if (!result.ok) {
        setImportStatus("error");
        setImportMessage(result.error);
        return;
      }

      setParsedResource(result.resource);
      setImportStatus("idle");
    } catch {
      setImportStatus("error");
      setImportMessage("解析失败，请检查网络连接或 GitHub URL。");
    }
  }

  async function saveGitHubResource() {
    if (!parsedResource) {
      return;
    }

    setImportStatus("saving");
    setImportMessage("");

    try {
      const response = await fetch("/api/resources/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resource: parsedResource })
      });
      const result = (await response.json()) as { ok: boolean; error?: string };

      if (!result.ok) {
        setImportStatus("error");
        setImportMessage(result.error ?? "保存失败。");
        return;
      }

      setImportStatus("saved");
      setImportMessage("资源已保存到 PostgreSQL resources 表。");
    } catch {
      setImportStatus("error");
      setImportMessage("保存失败，请检查 DATABASE_URL 和数据库 schema。");
    }
  }

  return (
    <div className="space-y-7 pb-10">
      <section className="rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(8,13,28,0.92),rgba(14,23,48,0.78)_52%,rgba(31,20,70,0.55))] p-5 shadow-glass sm:p-7">
        <div className="inline-flex items-center gap-2 rounded-md border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100">
          <Database className="h-3.5 w-3.5" />
          V1.0 本地管理
        </div>
        <h1 className="mt-4 text-3xl font-semibold sm:text-5xl">资源录入与导入</h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">
          当前管理页支持本地录入草稿，也支持单个 GitHub 仓库半自动解析后写入数据库 resources 表。
        </p>
      </section>

      <section className="grid gap-3 md:grid-cols-5">
        {resourcesByType.map((item) => (
          <div key={item.type} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{typeLabels[item.type]}</div>
            <div className="mt-3 text-2xl font-semibold">{item.count}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
          <div className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Plus className="h-5 w-5 text-cyan-200" />
            新增资源草稿
          </div>
          <div className="grid gap-3">
            <Field label="资源名称" value={draft.name} onChange={(value) => updateDraft("name", value)} />
            <label className="grid gap-2 text-sm">
              <span className="text-muted-foreground">资源类型</span>
              <select
                value={draft.type}
                onChange={(event) => updateDraft("type", event.target.value as ResourceType)}
                className="h-10 rounded-md border border-white/10 bg-slate-950/80 px-3 text-sm outline-none focus:border-cyan-300/40"
              >
                {resourceTypes.map((type) => (
                  <option key={type} value={type}>
                    {typeLabels[type]}
                  </option>
                ))}
              </select>
            </label>
            <Field label="中文摘要" value={draft.description} onChange={(value) => updateDraft("description", value)} textarea />
            <Field label="标签，用英文逗号分隔" value={draft.tags} onChange={(value) => updateDraft("tags", value)} />
            <Field label="支持工具，用英文逗号分隔" value={draft.supported_agents} onChange={(value) => updateDraft("supported_agents", value)} />
            <Field label="安装命令" value={draft.install_command} onChange={(value) => updateDraft("install_command", value)} />
            <Field label="适用场景，用英文逗号分隔" value={draft.use_cases} onChange={(value) => updateDraft("use_cases", value)} />
            <Field label="仓库 URL" value={draft.repo_url} onChange={(value) => updateDraft("repo_url", value)} />
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="风险等级" value={draft.risk_level} onChange={(value) => updateDraft("risk_level", value as RiskLevel)} />
              <Field label="可信度" value={draft.trust_score} onChange={(value) => updateDraft("trust_score", value)} />
              <Field label="适配度" value={draft.fit_score} onChange={(value) => updateDraft("fit_score", value)} />
            </div>
            <Button onClick={saveDraft} disabled={!draft.name || !draft.description}>
              <Save className="h-4 w-4" />
              保存本地草稿
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
          <h2 className="text-lg font-semibold">资源库状态</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            当前读取资源 {resources.length} 条，标签 {tags.length} 个。本页保存的本地草稿数量：{savedCount}。
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {tags.slice(0, 24).map((tag) => (
              <span key={tag} className="rounded-md border border-white/10 bg-black/20 px-2 py-1 text-xs text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-lg border border-cyan-300/20 bg-white/[0.045] p-5 shadow-glass">
          <div className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <GitBranch className="h-5 w-5 text-cyan-200" />
            导入 GitHub 资源
          </div>
          <p className="mb-4 text-sm leading-6 text-muted-foreground">
            第一版仅支持单个 GitHub 仓库 URL。解析会读取仓库信息、README、topics 和关键文件特征，不做批量爬取。
          </p>
          <div className="grid gap-3">
            <Field label="GitHub 仓库 URL" value={githubUrl} onChange={setGithubUrl} />
            <Button onClick={parseGitHubResource} disabled={!githubUrl || importStatus === "parsing"}>
              {importStatus === "parsing" ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitBranch className="h-4 w-4" />}
              解析仓库
            </Button>
            {importMessage ? (
              <div className={`flex items-start gap-2 rounded-md border p-3 text-sm ${
                importStatus === "saved"
                  ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
                  : "border-rose-300/25 bg-rose-300/10 text-rose-100"
              }`}>
                {importStatus === "saved" ? <Check className="mt-0.5 h-4 w-4" /> : <AlertCircle className="mt-0.5 h-4 w-4" />}
                {importMessage}
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
          <h2 className="text-lg font-semibold">解析预览</h2>
          {parsedResource ? (
            <div className="mt-4 space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <PreviewMetric label="类型" value={typeLabels[parsedResource.type]} />
                <PreviewMetric label="风险" value={parsedResource.risk_level} />
                <PreviewMetric label="Stars" value={parsedResource.github.stars.toString()} />
              </div>
              <div>
                <div className="text-sm font-medium">{parsedResource.name}</div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{parsedResource.description}</p>
              </div>
              <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                <div>Forks: {parsedResource.github.forks}</div>
                <div>License: {parsedResource.github.license ?? "未知"}</div>
                <div>Latest commit: {parsedResource.github.latest_commit_time ?? "未知"}</div>
                <div>SKILL.md: {parsedResource.github.has_skill_md ? "Yes" : "No"}</div>
                <div>package.json: {parsedResource.github.has_package_json ? "Yes" : "No"}</div>
                <div>MCP manifest: {parsedResource.github.has_mcp_manifest ? "Yes" : "No"}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {parsedResource.tags.map((tag) => (
                  <span key={tag} className="rounded-md border border-white/10 bg-black/20 px-2 py-1 text-xs text-muted-foreground">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="rounded-md border border-white/10 bg-black/25 p-3">
                <div className="text-xs text-muted-foreground">安装命令</div>
                <code className="mt-1 block text-xs text-cyan-100">{parsedResource.install_command || "未检测到"}</code>
              </div>
              <Button onClick={saveGitHubResource} disabled={importStatus === "saving"}>
                {importStatus === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                确认并保存到数据库
              </Button>
            </div>
          ) : (
            <div className="mt-4 rounded-md border border-white/10 bg-slate-950/45 p-4 text-sm text-muted-foreground">
              输入 GitHub URL 并解析后，这里会展示仓库名称、摘要、类型判断、风险初评、关键文件检测和安装方式。
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  textarea = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  textarea?: boolean;
}) {
  const className =
    "rounded-md border border-white/10 bg-slate-950/80 px-3 py-2 text-sm outline-none transition focus:border-cyan-300/40";

  return (
    <label className="grid gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      {textarea ? (
        <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} className={className} />
      ) : (
        <input value={value} onChange={(event) => onChange(event.target.value)} className={className} />
      )}
    </label>
  );
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-slate-950/45 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm text-slate-100">{value}</div>
    </div>
  );
}
