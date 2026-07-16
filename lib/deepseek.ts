import "server-only";

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
};

export type DeepSeekRerankItem = {
  id: string;
  score: number;
  reason: string;
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
      max_tokens: 1200,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "你是软件架构分析器。只输出合法 JSON，不编造外部资源事实。根据用户需求提取行业、项目类型、平台、目标用户、核心功能、推荐技术栈、复杂度和 8-20 个英文 slug 标签。JSON 字段必须是 industry, projectType, platform, targetUsers, coreFeatures, frontend, backend, database, orm, deploy, difficulty, tags。"
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
  return { ...parsed, coreFeatures: cleanList(parsed.coreFeatures, 8), tags: cleanList(parsed.tags, 20) };
}

export async function rerankWithDeepSeek(input: string, candidates: Array<{ id: string; name: string; type: string; description: string; tags: string[]; trust: number; fit: number; risk: string }>): Promise<DeepSeekRerankItem[]> {
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
        { role: "system", content: "你是资源推荐重排器。只输出合法 JSON，不能编造资源事实。根据项目需求为每个资源打 0-100 的适配分，并用一句话说明理由。必须返回 {\"items\":[{\"id\":\"原始id\",\"score\":数字,\"reason\":\"理由\"}]}。可信度和风险只作为输入参考，不要修改它们。" },
        { role: "user", content: JSON.stringify({ project: input, candidates }) }
      ]
    }),
    cache: "no-store"
  });

  if (!response.ok) throw new Error(`DeepSeek rerank failed: ${response.status}`);
  const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) return [];
  const parsed = JSON.parse(content) as { items?: DeepSeekRerankItem[] };
  return (parsed.items ?? []).filter((item) => typeof item?.id === "string" && typeof item?.score === "number").map((item) => ({ id: item.id, score: Math.max(0, Math.min(100, Math.round(item.score))), reason: item.reason || "与项目需求存在匹配。" }));
}

function cleanList(value: unknown, limit: number) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()))).slice(0, limit);
}
