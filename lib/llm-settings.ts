import {
  isLlmProvider,
  isValidModel,
  llmProviderDefinitions,
  llmProviders,
  type LlmProvider,
  type LlmRuntimeConfig
} from "@/lib/llm-config";

export const LLM_SETTINGS_STORAGE_KEY = "agent-skill-hub:llm-settings:v1";
export const LLM_SETTINGS_CHANGED_EVENT = "agent-skill-hub:llm-settings-changed";
export const OPEN_LLM_SETTINGS_EVENT = "agent-skill-hub:open-llm-settings";

export type StoredProviderConfig = {
  apiKey: string;
  model: string;
};

export type StoredLlmSettings = {
  version: 1;
  activeProvider: LlmProvider;
  providers: Partial<Record<LlmProvider, StoredProviderConfig>>;
};

export function createEmptyLlmSettings(): StoredLlmSettings {
  return {
    version: 1,
    activeProvider: "deepseek",
    providers: {}
  };
}

export function loadLlmSettings(): StoredLlmSettings {
  if (typeof window === "undefined") return createEmptyLlmSettings();
  const stored = window.localStorage.getItem(LLM_SETTINGS_STORAGE_KEY);
  if (!stored) return createEmptyLlmSettings();

  try {
    const parsed = JSON.parse(stored) as Record<string, unknown>;
    const activeProvider = isLlmProvider(parsed.activeProvider)
      ? parsed.activeProvider
      : "deepseek";
    const rawProviders = parsed.providers && typeof parsed.providers === "object"
      ? parsed.providers as Record<string, unknown>
      : {};
    const providers: StoredLlmSettings["providers"] = {};

    for (const provider of llmProviders) {
      const value = rawProviders[provider];
      if (!value || typeof value !== "object") continue;
      const candidate = value as Record<string, unknown>;
      if (typeof candidate.apiKey !== "string" || typeof candidate.model !== "string") continue;
      const apiKey = candidate.apiKey.trim();
      const model = candidate.model.trim();
      if (apiKey.length < 8 || apiKey.length > 1024 || !isValidModel(model)) continue;
      providers[provider] = { apiKey, model };
    }

    return { version: 1, activeProvider, providers };
  } catch {
    return createEmptyLlmSettings();
  }
}

export function saveLlmSettings(settings: StoredLlmSettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LLM_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent(LLM_SETTINGS_CHANGED_EVENT));
}

export function clearLlmSettings() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LLM_SETTINGS_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(LLM_SETTINGS_CHANGED_EVENT));
}

export function getActiveLlmConfig(
  settings = loadLlmSettings()
): LlmRuntimeConfig | null {
  const configured = settings.providers[settings.activeProvider];
  if (!configured) return null;
  return {
    provider: settings.activeProvider,
    apiKey: configured.apiKey,
    model: configured.model
  };
}

export function getProviderDraft(
  settings: StoredLlmSettings,
  provider: LlmProvider
): StoredProviderConfig {
  return settings.providers[provider] ?? {
    apiKey: "",
    model: llmProviderDefinitions[provider].defaultModel
  };
}

export function canTransmitApiKey() {
  if (typeof window === "undefined") return false;
  return window.isSecureContext
    || ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
}

export function openLlmSettings() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_LLM_SETTINGS_EVENT));
}

