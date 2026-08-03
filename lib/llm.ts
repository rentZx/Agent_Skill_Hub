import "server-only";

import type {
  CapabilityPriority,
  CapabilitySeed,
  ResourceRole
} from "@/lib/capability-engine";
import {
  llmProviderDefinitions,
  type LlmProvider,
  type LlmRuntimeConfig
} from "@/lib/llm-config";

type CompatibleChatResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
};

export type LlmProjectAnalysis = {
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
  repositoryHints?: string[];
};

export type LlmRerankItem = {
  id: string;
  score: number;
  reason: string;
  recommended: boolean;
  coveredCapabilities: string[];
  role?: ResourceRole;
};

export class LlmProviderRequestError extends Error {
  constructor(
    public readonly provider: LlmProvider,
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "LlmProviderRequestError";
  }
}

export async function analyzeWithLlm(
  input: string,
  config: LlmRuntimeConfig,
  timeoutMs = 15000
): Promise<LlmProjectAnalysis> {
  const content = await requestChatCompletion(
    config,
    [
        {
          role: "system",
          content: "你是软件架构分析器和 GitHub 检索规划器。只输出合法 JSON，不编造外部资源事实。根据用户需求提取行业、项目类型、平台、目标用户、核心功能、推荐技术栈、复杂度、8-16 个英文 slug 标签，以及 4-8 个可验证的项目能力。所有描述保持简洁，每个 description 和 coreFeature 不超过 40 个汉字。除 tags、capabilities.keywords、capabilities.negativeKeywords、capabilities.preferredTypes、capabilities.resourceRoles、searchQueries 和 repositoryHints 必须使用英文外，其他用户可见字段必须使用简体中文。coreFeatures 必须来自用户原始需求，禁止补充用户没有要求的功能。能力必须是单个开源资源可独立证明的原子能力，禁止把交互方式和业务动作组合成“语音查价格”“语音查库存”等端到端能力；这种需求应拆成库存系统、语音识别、受控业务查询。先识别业务闭环中的核心系统、核心数据或核心算法，再识别语音、实时接口、自动化、UI 等支撑能力。短视频生成需求必须拆出脚本生成、素材获取或生成、配音、字幕、视频合成与渲染；除非用户明确要求对话或工具调用，否则不要添加 natural-language-query、tool-calling 等能力。capabilities 每项必须包含 id、label、description、required、priority、resourceRoles、keywords、negativeKeywords、preferredTypes、inputEvidence。inputEvidence 必须包含 1-2 个从用户原始需求逐字复制的连续短语，每个短语 2-20 个字符；无法在原文找到直接依据的能力不得输出。priority 只能是 core、required、optional；至少 1 项且最多 3 项为 core。语音识别、MCP、UI、项目模板和开发工具不能标为 core；文本转语音只有在用户明确要求语音播报、语音回复或视频配音时才是 required，否则为 optional。resourceRoles 只能使用 domain_system、domain_data、domain_algorithm、speech_to_text、text_to_speech、agent_tool、mcp_integration、ui_library、project_template、developer_tool。preferredTypes 只能使用 agent_skill、mcp_server、github_plugin、ui_component、template_repo。keywords 应描述资源 README 中可验证的具体能力，不可只写 AI、Agent、React、API、management 等通用词；每项至少给出两个相互补充的具体多词短语，其中至少一个包含业务或行业术语。negativeKeywords 必须列出常见误匹配，例如语音识别需要排除 AI companion、voice changer，视频生成需要排除 ERP、inventory management、generic agent framework。searchQueries 输出 4-6 条按 core、required 能力拆分的 GitHub 英文检索短语，不包含搜索语法和仓库名。repositoryHints 可输出 0-8 个你有把握与需求直接相关的知名开源仓库，格式必须是 owner/repo；不确定时宁可不写，提示只用于 GitHub API 二次验证，不能替代仓库证据。constraints 输出用户提出的硬约束。JSON 字段必须是 industry, projectType, platform, targetUsers, coreFeatures, frontend, backend, database, orm, deploy, difficulty, tags, capabilities, constraints, searchQueries, repositoryHints。"
        },
        {
          role: "system",
          content: "补充并覆盖上一条的检索输出约束：searchQueries 每条使用 2-5 个英文词，至少两条使用科学术语、行业术语或专业同义词。不要猜测具体仓库名，资源候选必须由 GitHub 搜索和仓库证据验证产生。"
        },
        { role: "user", content: `请分析以下项目需求，并输出 JSON：${input}` }
    ],
    timeoutMs
  );
  const parsed = parseProviderJson<LlmProjectAnalysis>(content, config.provider);
  return {
    ...parsed,
    coreFeatures: cleanList(parsed.coreFeatures, 8),
    tags: cleanList(parsed.tags, 16),
    capabilities: cleanCapabilities(parsed.capabilities, 8),
    constraints: cleanList(parsed.constraints, 10),
    searchQueries: cleanList(parsed.searchQueries, 6),
    repositoryHints: cleanRepositoryHints(parsed.repositoryHints)
  };
}

export async function suggestRepositoriesWithLlm(
  input: string,
  config: LlmRuntimeConfig,
  timeoutMs = 10000
) {
  const content = await requestChatCompletion(
    config,
    [
      {
        role: "system",
        content: "你是开源仓库候选召回器，只输出合法 JSON：{\"repositories\":[\"owner/repo\"]}。根据用户明确需求列出 0-8 个你有把握真实存在、可复用且与核心业务能力直接相关的 GitHub 开源仓库。优先领域系统、领域数据、核心算法、协议实现和文件格式工具；不要推荐通用 UI、SaaS 模板、Awesome 列表、教程集合或仅因技术栈相同的仓库。仓库格式必须是 owner/repo，不写链接、解释或不存在的名称。不确定时宁可少写。所有候选还会由 GitHub API 和 README 重新验证。"
      },
      { role: "user", content: input }
    ],
    timeoutMs
  );
  const parsed = parseProviderJson<{ repositories?: unknown }>(content, config.provider);
  return cleanRepositoryHints(parsed.repositories);
}

export async function rerankWithLlm(config: LlmRuntimeConfig, input: string, candidates: Array<{
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
}>, requiredCapabilities: Array<{
  id: string;
  label: string;
  description: string;
  priority?: CapabilityPriority;
  resourceRoles?: ResourceRole[];
}> = [], timeoutMs = 15000): Promise<LlmRerankItem[]> {
  if (candidates.length === 0) return [];

  const content = await requestChatCompletion(
    config,
    [
        {
          role: "system",
          content: "你是资源组合推荐重排器。只输出合法 JSON，不能编造资源事实。根据项目需求和 requiredCapabilities 为每个候选打 0-100 的适配分，并判断是否应进入最终资源组合。必须逐项给出 coveredCapabilities，且只能填写输入中存在、并被候选 evidence、description、tags 或 matchedCapabilities 直接证明的能力 id。role 必须与能力的 resourceRoles 一致。硬规则：候选至少覆盖一项 core 或 required 能力才可 recommended=true；只命中 optional 能力，或只命中 Python、React、AI、Agent、GitHub、自动化、SaaS、模板等通用词时必须拒绝。通用 UI 组件库仅可作为 ui_library 支撑项，不能冒充业务核心。AI 陪伴、虚拟角色、变声产品不能视为语音识别；通用 SaaS 模板不能视为库存、金融、菜谱等领域系统。短视频项目中，ERP 的 asset management 不等于媒体素材管理，通用 Agent Tool 或 Laravel Agent 不等于视频生成；候选必须直接声明脚本、视频素材、配音、字幕、视频编辑、合成或渲染中的至少一项。优先使用 evidence 和 matchedCapabilities；没有仓库证据时只能依据 name、description 和 tags，不得推断未声明功能。score 低于 55、没有可验证必要能力或 reason 表示不建议使用时，recommended 必须为 false。reason 使用中文且控制在 80 个汉字以内，具体说明能接入的开发环节和能力边界，不要重复分数、可信度或风险。必须返回 {\"items\":[{\"id\":\"原始id\",\"score\":数字,\"recommended\":布尔值,\"coveredCapabilities\":[\"能力id\"],\"role\":\"资源角色\",\"reason\":\"具体理由\"}]}。可信度和风险只作为输入参考，不要修改它们。"
        },
        { role: "user", content: JSON.stringify({ project: input, requiredCapabilities, candidates }) }
    ],
    timeoutMs
  );
  const parsed = parseProviderJson<{ items?: Array<Partial<LlmRerankItem>> }>(
    content,
    config.provider
  );
  return (parsed.items ?? [])
    .filter((item): item is Partial<LlmRerankItem> & { id: string; score: number } =>
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
        coveredCapabilities: cleanList(item.coveredCapabilities, 10),
        role: cleanResourceRole(item.role),
        recommended: typeof item.recommended === "boolean"
          ? item.recommended
          : score >= 55 && !hasNegativeRecommendation(reason)
      };
    });
}

export function getPublicLlmErrorMessage(error: unknown) {
  if (!(error instanceof LlmProviderRequestError)) {
    return "模型服务请求失败，请检查网络后重试。";
  }

  const label = llmProviderDefinitions[error.provider].shortLabel;
  if (error.status === 401 || error.status === 403) {
    return `${label} API Key 无效、已失效或没有当前模型权限。`;
  }
  if (error.status === 429) {
    return `${label} 请求过于频繁或账户额度不足，请稍后重试。`;
  }
  if (error.status === 402) {
    return `${label} 账户余额或可用额度不足，请充值或检查账户状态。`;
  }
  if (error.status === 400 || error.status === 404) {
    return `${label} 拒绝了请求，请检查模型 ID 是否可用。`;
  }
  if (error.status === 408 || error.status === 504) {
    return `${label} 响应超时，请稍后重试。`;
  }
  return `${label} 暂时不可用（HTTP ${error.status}）。`;
}

async function requestChatCompletion(
  config: LlmRuntimeConfig,
  messages: Array<{ role: "system" | "user"; content: string }>,
  timeoutMs: number
) {
  const definition = llmProviderDefinitions[config.provider];
  const baseBody = {
    model: config.model,
    messages,
    ...(config.provider === "deepseek"
      ? { thinking: { type: "disabled" } }
      : {}),
    ...(config.provider === "openai"
      ? { max_completion_tokens: 1400 }
      : { max_tokens: 1400 })
  };
  const request = async (jsonMode: boolean) => {
    let response: Response;
    try {
      response = await fetch(definition.endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...baseBody,
          ...(jsonMode ? { response_format: { type: "json_object" } } : {})
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(timeoutMs)
      });
    } catch (error) {
      throw normalizeProviderRequestError(config.provider, error);
    }

    if (!response.ok) return { response, payload: null };
    try {
      return {
        response,
        payload: await response.json() as CompatibleChatResponse
      };
    } catch (error) {
      if (isTimeoutError(error)) {
        throw new LlmProviderRequestError(
          config.provider,
          504,
          "Provider response timed out."
        );
      }
      throw new LlmProviderRequestError(
        config.provider,
        502,
        "Provider returned invalid JSON."
      );
    }
  };

  let result = await request(true);
  if (result.response.status === 400) result = await request(false);
  const { response, payload } = result;

  if (!response.ok) {
    throw new LlmProviderRequestError(
      config.provider,
      response.status,
      `Provider request failed with status ${response.status}.`
    );
  }

  const content = payload?.choices?.[0]?.message?.content;
  if (!content) {
    throw new LlmProviderRequestError(config.provider, 502, "Provider returned an empty response.");
  }
  return content;
}

function normalizeProviderRequestError(provider: LlmProvider, error: unknown) {
  if (error instanceof LlmProviderRequestError) return error;
  if (isTimeoutError(error)) {
    return new LlmProviderRequestError(provider, 504, "Provider request timed out.");
  }
  return new LlmProviderRequestError(provider, 503, "Provider request failed.");
}

export function isTimeoutError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const name = (error as { name?: unknown }).name;
  return name === "TimeoutError" || name === "AbortError";
}

function parseProviderJson<T>(content: string, provider: LlmProvider) {
  try {
    return parseJsonObject<T>(content);
  } catch {
    throw new LlmProviderRequestError(
      provider,
      502,
      "Provider returned invalid structured output."
    );
  }
}

function cleanList(value: unknown, limit: number) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()))).slice(0, limit);
}

function cleanRepositoryHints(value: unknown) {
  return cleanList(value, 5)
    .map((repository) => repository.replace(/^https?:\/\/github\.com\//i, "").replace(/\/+$/, ""))
    .filter((repository) => /^[a-z0-9_.-]+\/[a-z0-9_.-]+$/i.test(repository));
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
      priority: cleanCapabilityPriority(candidate.priority),
      resourceRoles: cleanResourceRoles(candidate.resourceRoles),
      keywords: cleanList(candidate.keywords, 12),
      negativeKeywords: cleanList(candidate.negativeKeywords, 8),
      preferredTypes: cleanList(candidate.preferredTypes, 5),
      inputEvidence: cleanList(candidate.inputEvidence, 2)
    }];
  }).slice(0, limit);
}

function cleanCapabilityPriority(value: unknown): CapabilityPriority {
  return value === "core" || value === "required" || value === "optional" ? value : "required";
}

function cleanResourceRoles(value: unknown): ResourceRole[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(cleanResourceRole)
    .filter((role): role is ResourceRole => Boolean(role))
    .slice(0, 5);
}

function cleanResourceRole(value: unknown): ResourceRole | undefined {
  const roles: ResourceRole[] = [
    "domain_system",
    "domain_data",
    "domain_algorithm",
    "speech_to_text",
    "text_to_speech",
    "agent_tool",
    "mcp_integration",
    "ui_library",
    "project_template",
    "developer_tool"
  ];
  return typeof value === "string" && roles.includes(value as ResourceRole)
    ? value as ResourceRole
    : undefined;
}

function hasNegativeRecommendation(reason: string) {
  return /不建议使用|不推荐|无直接关系|没有直接关系|不相关|不匹配|不适合|不具备.+功能|缺少.+能力/i.test(reason);
}

function parseJsonObject<T>(content: string): T {
  const cleaned = content
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch (initialError) {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end <= start) throw initialError;
    const objectText = cleaned
      .slice(start, end + 1)
      .replace(/,\s*([}\]])/g, "$1");
    return JSON.parse(objectText) as T;
  }
}
