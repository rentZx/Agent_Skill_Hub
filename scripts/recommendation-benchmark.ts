import assert from "node:assert/strict";
import { buildCapabilityGraph, type CapabilitySeed } from "../lib/capability-engine";
import { buildProjectRecommendation } from "../lib/recommendation";
import type { Resource, ResourceType } from "../lib/types";

type BenchmarkCase = {
  name: string;
  prompt: string;
  projectType: string;
  capabilities: CapabilitySeed[];
  expectedQuery: string;
  relevant: Resource;
  irrelevant: Resource;
};

const cases: BenchmarkCase[] = [
  {
    name: "股票行情",
    prompt: "开发一个实时获取 A 股行情并分析走势的软件",
    projectType: "股票行情分析平台",
    capabilities: [
      capability("market-data", "实时股票行情", ["market data", "real-time quotes", "a-share"]),
      capability("technical-analysis", "技术指标分析", ["technical analysis", "macd", "candlestick"])
    ],
    expectedQuery: "market data",
    relevant: resource("AKShare", "template_repo", "A-share financial data and market data API", ["market-data", "a-share"]),
    irrelevant: resource("Generic Agent Starter", "template_repo", "General AI agent starter template", ["ai", "template"])
  },
  {
    name: "个性化菜谱",
    prompt: "根据食材、人数、忌口和年龄推荐菜品及制作过程",
    projectType: "个性化菜谱推荐系统",
    capabilities: [
      capability("recipe-data", "中文菜谱数据", ["chinese recipes", "ingredients", "cooking steps"]),
      capability("nutrition", "年龄与营养约束", ["personalized nutrition", "dietary restrictions", "age-aware"])
    ],
    expectedQuery: "chinese recipes",
    relevant: resource("HowToCook", "template_repo", "Chinese recipes with ingredients and cooking steps", ["chinese-recipes", "cooking-steps"]),
    irrelevant: resource("Generic Dashboard", "template_repo", "General purpose admin dashboard", ["dashboard", "template"])
  },
  {
    name: "2D 转 3D",
    prompt: "把二维图片转换成可以在网页预览的三维模型",
    projectType: "图像转三维工具",
    capabilities: [
      capability("image-to-3d", "二维图像转三维", ["image to 3d", "depth estimation", "mesh generation"]),
      capability("model-viewer", "三维模型预览", ["three.js", "webgl", "model viewer"])
    ],
    expectedQuery: "image to 3d",
    relevant: resource("img2threejs", "template_repo", "Generate a Three.js scene from an image with depth and mesh generation", ["image-to-3d", "threejs"]),
    irrelevant: resource("AI Research Agent", "template_repo", "Autonomous general AI research workflow", ["ai", "research"])
  },
  {
    name: "陌生领域物流优化",
    prompt: "开发配送调度系统，根据地址、车辆和时间窗规划最优路线",
    projectType: "物流配送调度系统",
    capabilities: [
      capability("route-optimization", "带时间窗的路径优化", ["vehicle routing", "route optimization", "time windows"]),
      capability("geocoding", "地址解析与地理编码", ["geocoding", "maps api", "address normalization"])
    ],
    expectedQuery: "vehicle routing",
    relevant: resource("OR-Tools Routing", "template_repo", "Vehicle routing and route optimization with time windows", ["vehicle-routing", "optimization"]),
    irrelevant: resource("General SaaS Boilerplate", "template_repo", "Generic SaaS starter with authentication", ["saas", "boilerplate"])
  }
];

for (const benchmark of cases) {
  const graph = buildCapabilityGraph(benchmark.prompt, {
    projectType: benchmark.projectType,
    coreFeatures: benchmark.capabilities.map((item) => item.label ?? ""),
    capabilities: benchmark.capabilities
  });
  assert(
    graph.searchQueries.some((query) => query.toLowerCase().includes(benchmark.expectedQuery)),
    `${benchmark.name}: 动态查询未包含 ${benchmark.expectedQuery}`
  );

  const recommendation = buildProjectRecommendation(
    benchmark.prompt,
    [benchmark.relevant, benchmark.irrelevant],
    {
      projectType: benchmark.projectType,
      coreFeatures: benchmark.capabilities.map((item) => item.label ?? ""),
      capabilityGraph: graph
    }
  );
  const recommendedNames = recommendation.groups.flatMap((group) => group.items.map((item) => item.resource.name));
  assert(recommendedNames.includes(benchmark.relevant.name), `${benchmark.name}: 未召回相关资源 ${benchmark.relevant.name}`);
  assert(
    !recommendedNames.includes(benchmark.irrelevant.name),
    `${benchmark.name}: 错误推荐通用资源 ${benchmark.irrelevant.name}；结果=${JSON.stringify(
      recommendation.groups.map((group) => ({
        id: group.id,
        items: group.items.map((item) => ({ name: item.resource.name, why: item.why, score: item.score }))
      }))
    )}`
  );
}

console.log(`Recommendation benchmark passed: ${cases.length} cases.`);

function capability(id: string, label: string, keywords: string[]): CapabilitySeed {
  return {
    id,
    label,
    description: `实现${label}`,
    required: true,
    keywords,
    negativeKeywords: ["generic starter"],
    preferredTypes: ["template_repo", "mcp_server", "agent_skill"]
  };
}

function resource(name: string, type: ResourceType, description: string, tags: string[]): Resource {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return {
    id: slug,
    slug,
    name,
    type,
    description,
    tags,
    supported_agents: ["Codex"],
    install_command: `Review and integrate ${name}`,
    use_cases: [description],
    risk_level: "low",
    trust_score: 80,
    fit_score: 80,
    repo_url: `https://github.com/example/${slug}`,
    source: "benchmark",
    last_updated: "2026-07-27"
  };
}
