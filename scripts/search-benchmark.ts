import assert from "node:assert/strict";
import { filterResources } from "../lib/resource-filters";
import type { Resource, ResourceType } from "../lib/types";

const cases = [
  {
    query: "做饭",
    relevant: resource("HowToCook", "template_repo", ["chinese-recipes", "cooking-steps"]),
    irrelevant: resource("Generic Agent Starter", "template_repo", ["ai", "starter"])
  },
  {
    query: "金融",
    relevant: resource("AKShare", "github_plugin", ["market-data", "a-share"]),
    irrelevant: resource("Generic Dashboard", "template_repo", ["dashboard"])
  },
  {
    query: "2D转3D",
    relevant: resource("img2threejs", "github_plugin", ["image-to-3d", "threejs"]),
    irrelevant: resource("Research Agent", "agent_skill", ["research", "agent"])
  },
  {
    query: "超市 语音 库存",
    relevant: resource("InvenTree", "template_repo", ["inventory-management", "stock-control"]),
    secondary: resource("FunASR", "github_plugin", ["speech-to-text", "chinese-asr"]),
    irrelevant: resource("Voice Companion", "template_repo", ["ai-companion", "voice-chat"])
  },
  {
    query: "宠物医院 疫苗 病历",
    relevant: resource("OpenVPMS", "template_repo", ["veterinary", "medical-records", "vaccination"]),
    irrelevant: resource("Hospital Landing Page", "template_repo", ["landing-page"])
  }
];

for (const benchmark of cases) {
  const candidates = [
    benchmark.relevant,
    ...(benchmark.secondary ? [benchmark.secondary] : []),
    benchmark.irrelevant
  ];
  const results = filterResources(candidates, { query: benchmark.query });
  const names = results.map((item) => item.name);

  assert(names.includes(benchmark.relevant.name), `${benchmark.query}: 未召回 ${benchmark.relevant.name}`);
  if (benchmark.secondary) {
    assert(names.includes(benchmark.secondary.name), `${benchmark.query}: 未召回 ${benchmark.secondary.name}`);
  }
  assert(!names.includes(benchmark.irrelevant.name), `${benchmark.query}: 错误召回 ${benchmark.irrelevant.name}`);
}

console.log(`Search benchmark passed: ${cases.length} cases.`);

function resource(name: string, type: ResourceType, tags: string[]): Resource {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return {
    id: slug,
    slug,
    name,
    type,
    description: tags.join(" "),
    tags,
    supported_agents: ["Codex"],
    install_command: `Review ${name}`,
    use_cases: tags,
    risk_level: "low",
    trust_score: 80,
    fit_score: 80,
    repo_url: `https://github.com/example/${slug}`,
    source: "benchmark",
    last_updated: "2026-07-28"
  };
}
