"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  Settings,
  ShieldAlert,
  Trash2,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  isValidModel,
  llmProviderDefinitions,
  llmProviders,
  parseLlmRuntimeConfig,
  type LlmProvider
} from "@/lib/llm-config";
import {
  canTransmitApiKey,
  clearLlmSettings,
  createEmptyLlmSettings,
  getActiveLlmConfig,
  getProviderDraft,
  LLM_SETTINGS_CHANGED_EVENT,
  loadLlmSettings,
  OPEN_LLM_SETTINGS_EVENT,
  saveLlmSettings,
  type StoredLlmSettings
} from "@/lib/llm-settings";

export function ModelSettings() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<StoredLlmSettings>(createEmptyLlmSettings);
  const [provider, setProvider] = useState<LlmProvider>("deepseek");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(llmProviderDefinitions.deepseek.defaultModel);
  const [showKey, setShowKey] = useState(false);
  const [secure, setSecure] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function refreshSettings() {
      const stored = loadLlmSettings();
      setSettings(stored);
    }
    function showSettings() {
      const stored = loadLlmSettings();
      const active = stored.activeProvider;
      const draft = getProviderDraft(stored, active);
      setSettings(stored);
      setProvider(active);
      setApiKey(draft.apiKey);
      setModel(draft.model);
      setSecure(canTransmitApiKey());
      setError("");
      setShowKey(false);
      setOpen(true);
    }

    refreshSettings();
    setSecure(canTransmitApiKey());
    window.addEventListener(LLM_SETTINGS_CHANGED_EVENT, refreshSettings);
    window.addEventListener(OPEN_LLM_SETTINGS_EVENT, showSettings);
    return () => {
      window.removeEventListener(LLM_SETTINGS_CHANGED_EVENT, refreshSettings);
      window.removeEventListener(OPEN_LLM_SETTINGS_EVENT, showSettings);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  function openDialog() {
    const stored = loadLlmSettings();
    const active = stored.activeProvider;
    const draft = getProviderDraft(stored, active);
    setSettings(stored);
    setProvider(active);
    setApiKey(draft.apiKey);
    setModel(draft.model);
    setSecure(canTransmitApiKey());
    setError("");
    setShowKey(false);
    setOpen(true);
  }

  function selectProvider(nextProvider: LlmProvider) {
    const draft = getProviderDraft(settings, nextProvider);
    setProvider(nextProvider);
    setApiKey(draft.apiKey);
    setModel(draft.model);
    setError("");
    setShowKey(false);
  }

  function save() {
    if (!secure) {
      setError("当前页面未启用 HTTPS。为保护 API Key，暂不能保存或发送模型配置。");
      return;
    }
    const config = parseLlmRuntimeConfig({ provider, apiKey, model });
    if (!config) {
      setError(!isValidModel(model.trim())
        ? "模型 ID 格式不正确。"
        : "请输入有效的 API Key。");
      return;
    }

    const next: StoredLlmSettings = {
      version: 1,
      activeProvider: provider,
      providers: {
        ...settings.providers,
        [provider]: {
          apiKey: config.apiKey,
          model: config.model
        }
      }
    };
    saveLlmSettings(next);
    setSettings(next);
    setError("");
    setOpen(false);
  }

  function removeProvider() {
    const providers = { ...settings.providers };
    delete providers[provider];
    const next = { ...settings, activeProvider: provider, providers };
    saveLlmSettings(next);
    setSettings(next);
    const draft = getProviderDraft(next, provider);
    setApiKey(draft.apiKey);
    setModel(draft.model);
    setError("");
  }

  function removeAll() {
    clearLlmSettings();
    const empty = createEmptyLlmSettings();
    setSettings(empty);
    setProvider(empty.activeProvider);
    setApiKey("");
    setModel(llmProviderDefinitions[empty.activeProvider].defaultModel);
    setError("");
  }

  const activeConfig = getActiveLlmConfig(settings);
  const definition = llmProviderDefinitions[provider];

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="relative flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-white/[0.045] text-muted-foreground transition hover:border-cyan-300/30 hover:bg-white/[0.08] hover:text-foreground"
        aria-label="模型设置"
        title="模型设置"
      >
        <Settings className="h-4 w-4" />
        {activeConfig ? (
          <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-emerald-300" />
        ) : null}
      </button>

      {open ? createPortal((
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm sm:items-center"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="model-settings-title"
            className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-lg border border-white/10 bg-slate-950 p-5 shadow-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="model-settings-title" className="text-lg font-semibold text-slate-100">
                  大模型设置
                </h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  分别保存各供应商配置，并选择本次项目分析使用的模型。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-white/[0.08] hover:text-foreground"
                aria-label="关闭"
                title="关闭"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 grid gap-4">
              <label className="grid gap-2 text-sm">
                <span className="text-xs text-muted-foreground">供应商</span>
                <select
                  value={provider}
                  onChange={(event) => selectProvider(event.target.value as LlmProvider)}
                  className="h-11 rounded-md border border-white/10 bg-white/[0.055] px-3 text-slate-100 outline-none focus:border-cyan-300/40"
                >
                  {llmProviders.map((item) => (
                    <option key={item} value={item} className="bg-slate-950">
                      {llmProviderDefinitions[item].label}
                      {settings.providers[item] ? "（已配置）" : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm">
                <span className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  API Key
                  <a
                    href={definition.apiKeyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-cyan-200 hover:text-cyan-100"
                  >
                    获取 Key <ExternalLink className="h-3 w-3" />
                  </a>
                </span>
                <span className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(event) => setApiKey(event.target.value)}
                    autoComplete="new-password"
                    spellCheck={false}
                    className="h-11 w-full rounded-md border border-white/10 bg-white/[0.055] px-3 pr-11 text-slate-100 outline-none focus:border-cyan-300/40"
                    placeholder="输入当前供应商的 API Key"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((value) => !value)}
                    className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-white/[0.08] hover:text-foreground"
                    aria-label={showKey ? "隐藏 API Key" : "显示 API Key"}
                    title={showKey ? "隐藏 API Key" : "显示 API Key"}
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </span>
              </label>

              <label className="grid gap-2 text-sm">
                <span className="text-xs text-muted-foreground">模型 ID</span>
                <input
                  type="text"
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                  spellCheck={false}
                  className="h-11 rounded-md border border-white/10 bg-white/[0.055] px-3 text-slate-100 outline-none focus:border-cyan-300/40"
                />
              </label>

              <div className={`rounded-md border px-3 py-3 text-xs leading-5 ${
                secure
                  ? "border-emerald-300/20 bg-emerald-300/[0.06] text-emerald-100"
                  : "border-amber-300/25 bg-amber-300/[0.08] text-amber-100"
              }`}>
                <div className="flex items-start gap-2">
                  {secure
                    ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    : <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                  <span>
                    {secure
                      ? "Key 仅保存在当前浏览器；分析时临时转发给所选官方接口，不写入平台数据库、缓存或日志。"
                      : "当前站点使用 HTTP。启用 HTTPS 前，平台不会保存或传输任何 API Key。"}
                  </span>
                </div>
              </div>

              {error ? <div className="text-xs text-rose-200">{error}</div> : null}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
              <div className="flex gap-2">
                {settings.providers[provider] ? (
                  <Button type="button" variant="ghost" size="sm" onClick={removeProvider}>
                    <Trash2 className="h-4 w-4" />清除当前
                  </Button>
                ) : null}
                {Object.keys(settings.providers).length > 1 ? (
                  <Button type="button" variant="ghost" size="sm" onClick={removeAll}>
                    清除全部
                  </Button>
                ) : null}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                  取消
                </Button>
                <Button type="button" onClick={save} disabled={!secure}>
                  保存并启用
                </Button>
              </div>
            </div>
          </section>
        </div>
      ), document.body) : null}
    </>
  );
}
