import assert from "node:assert/strict";
import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../lib/db/schema";
import { buildCapabilityGraph } from "../lib/capability-engine";
import { listVerifiedResourceArtifacts } from "../lib/db/resource-model-v2-read";
import { analyzeProject } from "../lib/project-analyzer";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required.");

const client = postgres(databaseUrl, { max: 2, prepare: false });
const db = drizzle(client, { schema });

const cases = [
  {
    name: "2D 转 3D",
    prompt: "2D 转 3D，把二维图片转换成可以在网页预览的三维模型",
    mustInclude: ["img2threejs"],
    targetPool: ["stable-fast-3d", "InstantMesh", "TripoSR"],
    minTargetMatches: 1,
    forbidden: ["Auto-claude-code-research-in-sleep", "mediapipe", "ARIS"]
  },
  {
    name: "股票行情分析",
    prompt: "开发炒股软件，实时获取股票市场信息并分析走势",
    mustInclude: [],
    targetPool: ["daily_stock_analysis", "akshare", "mootdx", "qlib", "rqalpha", "TradingAgents-CN"],
    minTargetMatches: 2,
    forbidden: ["Generic Agent Starter", "PuroAir", "FunASR"]
  },
  {
    name: "个性化菜谱",
    prompt: "做一个做饭系统，根据食材、用餐人数、忌口和年龄推荐菜品及制作过程",
    mustInclude: ["HowToCook"],
    targetPool: ["HowToCook-mcp", "mealie", "recipes", "grocy", "Recipe-AI-Easy-Recipes"],
    minTargetMatches: 1,
    forbidden: [
      "Supabase pgvector Starter",
      "Vercel AI SDK Starter",
      "Taxonomy Template for Agent Resources",
      "FunASR",
      "MCP Server: Playwright",
      "BlueNexus Universal MCP"
    ]
  },
  {
    name: "超市语音库存",
    prompt: "我有一个超市，开发货物管理系统，通过语音聊天查询物品价格、数量和所在位置",
    mustInclude: ["InvenTree"],
    targetPool: ["FunASR", "faster-whisper", "Agentic Shelf", "erpnext"],
    minTargetMatches: 1,
    forbidden: ["AIRI", "next-saas-starter", "react-responsive-overflow-list"]
  },
  {
    name: "AI 短视频",
    prompt: "开发一站式 AI 短视频生成工具，从主题生成文案、素材、配音、字幕并合成竖屏视频",
    mustInclude: ["MoneyPrinterTurbo"],
    targetPool: ["short-video-maker", "MoneyPrinter", "Text-To-Video-AI"],
    minTargetMatches: 1,
    forbidden: ["erpnext", "neuron-tool-creator", "img2threejs"]
  },
  {
    name: "画室管理",
    prompt: "我要开发一个画室管理系统",
    mustInclude: [],
    targetPool: ["education", "Frappe Education", "core", "Gibbon 学校管理平台", "RosarioSIS", "UniTime", "UniTime 排课系统", "FullCalendar"],
    minTargetMatches: 3,
    forbidden: ["@heymantle/react", "MoneyPrinterTurbo", "InvenTree", "FunASR"]
  }
];

async function main() {
  const resources = await listVerifiedResourceArtifacts(db);
  const failures: string[] = [];
  const reports = cases.map((testCase) => {
    const initial = analyzeProject(testCase.prompt, resources);
    const capabilityGraph = buildCapabilityGraph(testCase.prompt, {
      projectType: initial.analysis.projectType,
      coreFeatures: initial.analysis.coreFeatures,
      tags: initial.analysis.tags
    });
    const result = analyzeProject(testCase.prompt, resources, {}, capabilityGraph);
    const items = result.recommendation.groups.flatMap((group) =>
      group.items.map((item) => ({
        group: group.id,
        name: item.resource.name,
        kind: item.resource.artifact_kind,
        score: item.score,
        matchedCapabilities: item.matchedCapabilityIds
      }))
    );
    const names = items.map((item) => item.name.toLowerCase());
    const missing = testCase.mustInclude.filter((name) => !names.includes(name.toLowerCase()));
    const targetMatches = testCase.targetPool.filter((name) => names.includes(name.toLowerCase()));
    const forbiddenMatches = testCase.forbidden.filter((name) => names.includes(name.toLowerCase()));

    if (missing.length > 0) failures.push(`${testCase.name}: 缺少必选资源 ${missing.join(", ")}`);
    if (targetMatches.length < testCase.minTargetMatches) {
      failures.push(`${testCase.name}: 目标资源命中 ${targetMatches.length}/${testCase.minTargetMatches}`);
    }
    if (forbiddenMatches.length > 0) {
      failures.push(`${testCase.name}: 命中无关资源 ${forbiddenMatches.join(", ")}`);
    }

    return {
      name: testCase.name,
      projectType: result.analysis.projectType,
      capabilities: capabilityGraph.capabilities.map((capability) => capability.id),
      targetMatches,
      missing,
      forbiddenMatches,
      recommendations: items
    };
  });

  const byKind = Object.fromEntries(
    Array.from(new Set(resources.map((resource) => resource.artifact_kind))).map((kind) => [
      kind ?? "unknown",
      resources.filter((resource) => resource.artifact_kind === kind).length
    ])
  );
  console.log(JSON.stringify({
    resourceCount: resources.length,
    byKind,
    passed: failures.length === 0,
    failures,
    cases: reports
  }, null, 2));

  assert.equal(failures.length, 0, failures.join("\n"));
}

void main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end();
  });
