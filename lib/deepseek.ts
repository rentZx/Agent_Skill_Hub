import "server-only";

import type { CapabilitySeed } from "@/lib/capability-engine";

type DeepSeekResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
};

export type DeepSeekProjectAnalysis = {
  industry?: string;
  projectType?: string;
  platform?: string;
  targetUsers?: string;
  coreFeatures?: string[];
  frontend?: string;
  backend?: string;
  database?: string;
  orm?: string;
  deploy?: string;
  difficulty?: string;
  tags?: string[];
  capabilities?: CapabilitySeed[];
  constraints?: string[];
  searchQueries?: string[];
};

export type DeepSeekRerankItem = {
  id: string;
  score: number;
  reason: string;
  recommended: boolean;
};

export async function analyzeWithDeepSeek(input: string): Promise<DeepSeekProjectAnalysis | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;

  const response = await fetch(`${process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com"}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
      temperature: 0.1,
      max_tokens: 1800,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "你是软件架构分析器和 GitHub 检索规划器。只输出合法 JSON，不编造外部资源事实。根据用户需求提取行业、项目类型、平台、目标用户、核心功能、推荐技术栈、复杂度、8-20 个英文 slug 标签，以及 3-8 个可验证的项目能力。除 tags、capabilities.keywords、capabilities.negativeKeywords、capabilities.preferredTypes 和 searchQueries 必须使用英文外，其他用户可见字段必须使用简体中文。coreFeatures 必须是来自用户原始需求的具体业务功能。capabilities 每项必须包含 id、label、description、required、keywords、negativeKeywords、preferredTypes；preferredTypes 只能使用 agent_skill、mcp_server、github_plugin、ui_component、template_repo。keywords 应描述资源实际应具备的能力，negativeKeywords 描述常见误匹配。searchQueries 输出 4-8 条适合 GitHub 仓库搜索的英文能力短语，不包含 in:、sort:、stars: 等搜索语法，不得直接编造仓库名。constraints 输出用户提出的硬约束。JSON 字段必须是 industry, projectType, platform, targetUsers, coreFeatures, frontend, backend, database, orm, deploy, difficulty, tags, capabilities, constraints, searchQueries。"
        },
        { role: "user", content: `请分析以下项目需求，并输出 JSON：${input}` }
      ]
    }),
    cache: "no-store"
  });

  if (!response.ok) throw new Error(`DeepSeek API request failed: ${response.status}`);
  const payload = (await response.json()) as DeepSeekResponse;
  const content = payload.choices?.[0]?.message?.content;
  if (!content) return null;
  const parsed = JSON.parse(content) as DeepSeekProjectAnalysis;
  return {
    ...parsed,
    coreFeatures: cleanList(parsed.coreFeatures, 8),
    tags: cleanList(parsed.tags, 20),
    capabilities: cleanCapabilities(parsed.capabilities, 10),
    constraints: cleanList(parsed.constraints, 10),
    searchQueries: cleanList(parsed.searchQueries, 8)
  };
}

export async function rerankWithDeepSeek(input: string, candidates: Array<{
  id: string;
  name: string;
  type: string;
  description: string;
  tags: string[];
  evidence?: string;
  matchedCapabilities?: string[];
  trust: number;
  fit: number;
  risk: string;
}>): Promise<DeepSeekRerankItem[]> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || candidates.length === 0) return [];

  const response = await fetch(`${process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com"}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
      temperature: 0.1,
      max_tokens: 2200,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "你是资源推荐重排器。只输出合法 JSON，不能编造资源事实。根据项目需求为每个资源打 0-100 的适配分，并判断是否应该进入最终推荐。优先使用候选的 evidence 和 matchedCapabilities 作为能力证据；没有证据时只能依据 name、description 和 tags，不得推断未声明的功能。只有能直接实现项目核心功能或明确支撑其技术方案的资源，recommended 才能为 true；仅仅属于通用 AI、研究、GitHub、自动化或基础设施不能视为相关。score 低于 50、缺少目标功能、与需求无直接关系或不建议使用时，recommended 必须为 false。reason 必须使用中文，先说明资源有证据支持的具体功能，再说明它与当前项目哪项需求直接匹配；不相关时明确说明原因。禁止使用“对应开发环节”“提升开发效率”“提供支持”等空泛模板句，不要在 reason 中重复分数、可信度或风险。必须返回 {\"items\":[{\"id\":\"原始id\",\"score\":数字,\"recommended\":布尔值,\"reason\":\"具体理由\"}]}。可信度和风险只作为输入参考，不要修改它们。"
        },
        { role: "user", content: JSON.stringify({ project: input, candidates }) }
      ]
    }),
    cache: "no-store"
  });

  if (!response.ok) throw new Error(`DeepSeek rerank failed: ${response.status}`);
  const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) return [];
  const parsed = JSON.parse(content) as { items?: Array<Partial<DeepSeekRerankItem>> };
  return (parsed.items ?? [])
    .filter((item): item is Partial<DeepSeekRerankItem> & { id: string; score: number } =>
      typeof item?.id === "string" && typeof item?.score === "number"
    )
    .map((item) => {
      const score = Math.max(0, Math.min(100, Math.round(item.score)));
      const reason = typeof item.reason === "string" && item.reason.trim()
        ? item.reason.trim()
        : "未提供足够的直接匹配依据。";
      return {
        id: item.id,
        score,
        reason,
        recommended: typeof item.recommended === "boolean"
          ? item.recommended
          : score >= 50 && !hasNegativeRecommendation(reason)
      };
    });
}

function cleanList(value: unknown, limit: number) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()))).slice(0, limit);
}

function cleanCapabilities(value: unknown, limit: number): CapabilitySeed[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const candidate = item as Record<string, unknown>;
    if (typeof candidate.label !== "string") return [];
    return [{
      id: typeof candidate.id === "string" ? candidate.id : undefined,
      label: candidate.label,
      description: typeof candidate.description === "string" ? candidate.description : undefined,
      required: typeof candidate.required === "boolean" ? candidate.required : true,
      keywords: cleanList(candidate.keywords, 12),
      negativeKeywords: cleanList(candidate.negativeKeywords, 8),
      preferredTypes: cleanList(candidate.preferredTypes, 5)
    }];
  }).slice(0, limit);
}

function hasNegativeRecommendation(reason: string) {
  return /不建议使用|不推荐|无直接关系|没有直接关系|不相关|不匹配|不适合|不具备.+功能|缺少.+能力/i.test(reason);
}
