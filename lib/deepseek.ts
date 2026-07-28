import "server-only";

import type {
  CapabilityPriority,
  CapabilitySeed,
  ResourceRole
} from "@/lib/capability-engine";

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
  coveredCapabilities: string[];
  role?: ResourceRole;
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
          content: "你是软件架构分析器和 GitHub 检索规划器。只输出合法 JSON，不编造外部资源事实。根据用户需求提取行业、项目类型、平台、目标用户、核心功能、推荐技术栈、复杂度、8-20 个英文 slug 标签，以及 4-10 个可验证的项目能力。除 tags、capabilities.keywords、capabilities.negativeKeywords、capabilities.preferredTypes、capabilities.resourceRoles 和 searchQueries 必须使用英文外，其他用户可见字段必须使用简体中文。coreFeatures 必须来自用户原始需求。先识别业务闭环中的核心系统、核心数据或核心算法，再识别语音、实时接口、自动化、UI 等支撑能力。capabilities 每项必须包含 id、label、description、required、priority、resourceRoles、keywords、negativeKeywords、preferredTypes。priority 只能是 core、required、optional；至少 1 项且最多 3 项为 core。resourceRoles 只能使用 domain_system、domain_data、domain_algorithm、speech_to_text、text_to_speech、agent_tool、mcp_integration、ui_library、project_template、developer_tool。preferredTypes 只能使用 agent_skill、mcp_server、github_plugin、ui_component、template_repo。keywords 应描述资源 README 中可验证的具体能力，不可只写 AI、Agent、React、API、management 等通用词；negativeKeywords 必须列出常见误匹配，例如语音识别需要排除 AI companion、voice changer。searchQueries 输出 4-8 条按 core、required 能力拆分的 GitHub 英文检索短语，不包含搜索语法，不得直接编造仓库名。constraints 输出用户提出的硬约束。JSON 字段必须是 industry, projectType, platform, targetUsers, coreFeatures, frontend, backend, database, orm, deploy, difficulty, tags, capabilities, constraints, searchQueries。"
        },
        { role: "user", content: `请分析以下项目需求，并输出 JSON：${input}` }
      ]
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15000)
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
}>, requiredCapabilities: Array<{
  id: string;
  label: string;
  description: string;
  priority?: CapabilityPriority;
  resourceRoles?: ResourceRole[];
}> = []): Promise<DeepSeekRerankItem[]> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || candidates.length === 0) return [];

  const response = await fetch(`${process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com"}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
      temperature: 0.1,
      max_tokens: 2600,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "你是资源组合推荐重排器。只输出合法 JSON，不能编造资源事实。根据项目需求和 requiredCapabilities 为每个候选打 0-100 的适配分，并判断是否应进入最终资源组合。必须逐项给出 coveredCapabilities，且只能填写输入中存在、并被候选 evidence、description、tags 或 matchedCapabilities 直接证明的能力 id。role 必须与能力的 resourceRoles 一致。硬规则：候选至少覆盖一项 core 或 required 能力才可 recommended=true；只命中 optional 能力，或只命中 Python、React、AI、Agent、GitHub、自动化、SaaS、模板等通用词时必须拒绝。通用 UI 组件库仅可作为 ui_library 支撑项，不能冒充业务核心。AI 陪伴、虚拟角色、变声产品不能视为语音识别；通用 SaaS 模板不能视为库存、金融、菜谱等领域系统。优先使用 evidence 和 matchedCapabilities；没有仓库证据时只能依据 name、description 和 tags，不得推断未声明功能。score 低于 55、没有可验证必要能力或 reason 表示不建议使用时，recommended 必须为 false。reason 使用中文且控制在 80 个汉字以内，具体说明能接入的开发环节和能力边界，不要重复分数、可信度或风险。必须返回 {\"items\":[{\"id\":\"原始id\",\"score\":数字,\"recommended\":布尔值,\"coveredCapabilities\":[\"能力id\"],\"role\":\"资源角色\",\"reason\":\"具体理由\"}]}。可信度和风险只作为输入参考，不要修改它们。"
        },
        { role: "user", content: JSON.stringify({ project: input, requiredCapabilities, candidates }) }
      ]
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15000)
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
        coveredCapabilities: cleanList(item.coveredCapabilities, 10),
        role: cleanResourceRole(item.role),
        recommended: typeof item.recommended === "boolean"
          ? item.recommended
          : score >= 55 && !hasNegativeRecommendation(reason)
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
      priority: cleanCapabilityPriority(candidate.priority),
      resourceRoles: cleanResourceRoles(candidate.resourceRoles),
      keywords: cleanList(candidate.keywords, 12),
      negativeKeywords: cleanList(candidate.negativeKeywords, 8),
      preferredTypes: cleanList(candidate.preferredTypes, 5)
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
