export const llmProviders = ["deepseek", "openai", "gemini", "kimi"] as const;

export type LlmProvider = typeof llmProviders[number];

export type LlmRuntimeConfig = {
  provider: LlmProvider;
  apiKey: string;
  model: string;
};

export type LlmProviderDefinition = {
  label: string;
  shortLabel: string;
  defaultModel: string;
  endpoint: string;
  apiKeyUrl: string;
};

export const llmProviderDefinitions: Record<LlmProvider, LlmProviderDefinition> = {
  deepseek: {
    label: "DeepSeek",
    shortLabel: "DeepSeek",
    defaultModel: "deepseek-v4-flash",
    endpoint: "https://api.deepseek.com/chat/completions",
    apiKeyUrl: "https://platform.deepseek.com/api_keys"
  },
  openai: {
    label: "OpenAI（ChatGPT API）",
    shortLabel: "OpenAI",
    defaultModel: "gpt-5.4-mini",
    endpoint: "https://api.openai.com/v1/chat/completions",
    apiKeyUrl: "https://platform.openai.com/api-keys"
  },
  gemini: {
    label: "Google Gemini",
    shortLabel: "Gemini",
    defaultModel: "gemini-3.6-flash",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    apiKeyUrl: "https://aistudio.google.com/apikey"
  },
  kimi: {
    label: "Kimi（Moonshot AI）",
    shortLabel: "Kimi",
    defaultModel: "kimi-k2.6",
    endpoint: "https://api.moonshot.cn/v1/chat/completions",
    apiKeyUrl: "https://platform.kimi.com/console/api-keys"
  }
};

export function parseLlmRuntimeConfig(value: unknown): LlmRuntimeConfig | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  if (!isLlmProvider(candidate.provider)) return null;
  if (typeof candidate.apiKey !== "string") return null;
  if (typeof candidate.model !== "string") return null;

  const apiKey = candidate.apiKey.trim();
  const model = candidate.model.trim();
  if (apiKey.length < 8 || apiKey.length > 1024) return null;
  if (!isValidModel(model)) return null;

  return {
    provider: candidate.provider,
    apiKey,
    model
  };
}

export function isLlmProvider(value: unknown): value is LlmProvider {
  return typeof value === "string"
    && llmProviders.includes(value as LlmProvider);
}

export function isValidModel(value: string) {
  return value.length >= 2
    && value.length <= 120
    && /^[a-z0-9][a-z0-9._:/-]*$/i.test(value);
}

