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
    mustCover: ["image-to-3d"],
    forbidden: ["Auto-claude-code-research-in-sleep", "mediapipe", "ARIS"]
  },
  {
    name: "股票行情分析",
    prompt: "开发炒股软件，实时获取股票市场信息并分析走势",
    mustInclude: [],
    targetPool: ["daily_stock_analysis", "akshare", "mootdx", "qlib", "rqalpha", "TradingAgents-CN"],
    minTargetMatches: 2,
    mustCover: ["stock-market-data", "technical-analysis"],
    forbidden: ["Generic Agent Starter", "PuroAir", "FunASR"]
  },
  {
    name: "个性化菜谱",
    prompt: "做一个做饭系统，根据食材、用餐人数、忌口和年龄推荐菜品及制作过程",
    mustInclude: ["HowToCook"],
    targetPool: ["HowToCook-mcp", "mealie", "recipes", "grocy", "Recipe-AI-Easy-Recipes"],
    minTargetMatches: 1,
    mustCover: ["recipe-data"],
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
    mustCover: ["inventory-management", "speech-to-text"],
    forbidden: ["AIRI", "next-saas-starter", "react-responsive-overflow-list"]
  },
  {
    name: "AI 短视频",
    prompt: "开发一站式 AI 短视频生成工具，从主题生成文案、素材、配音、字幕并合成竖屏视频",
    mustInclude: ["MoneyPrinterTurbo"],
    targetPool: ["short-video-maker", "MoneyPrinter", "Text-To-Video-AI"],
    minTargetMatches: 1,
    mustCover: ["short-video-pipeline", "auto-caption", "voiceover"],
    forbidden: ["erpnext", "neuron-tool-creator", "img2threejs"]
  },
  {
    name: "画室管理",
    prompt: "我要开发一个画室管理系统",
    mustInclude: [],
    targetPool: ["education", "Frappe Education", "core", "Gibbon 学校管理平台", "RosarioSIS", "UniTime", "UniTime 排课系统", "FullCalendar"],
    minTargetMatches: 3,
    mustCover: ["education-management", "course-scheduling", "tuition-billing"],
    forbidden: ["@heymantle/react", "MoneyPrinterTurbo", "InvenTree", "FunASR"]
  },
  {
    name: "天气记录与预报",
    prompt: "我想做一个天气记录系统，显示实时天气、未来七天预报并保存历史天气趋势",
    mustInclude: ["Open-Meteo 天气服务"],
    targetPool: [],
    minTargetMatches: 0,
    mustCover: ["weather-forecast-data", "historical-weather"],
    forbidden: ["HowToCook", "MoneyPrinterTurbo", "FunASR"]
  },
  {
    name: "饮食与营养记录",
    prompt: "开发一个饮食记录系统，按餐次记录食物和热量，扫描食品条码查询营养成分并跟踪每日目标",
    mustInclude: ["OpenNutriTracker 饮食记录"],
    targetPool: ["Open Food Facts 食品数据库", "FoodYou 饮食日志", "wger 健身与营养管理"],
    minTargetMatches: 1,
    mustCover: ["food-diary", "nutrition-database"],
    forbidden: ["HowToCook", "MoneyPrinterTurbo", "mootdx"]
  },
  {
    name: "健身训练记录",
    prompt: "开发健身记录系统，制定训练计划，记录每次动作组数重量、体重和运动进度",
    mustInclude: ["wger 健身与营养管理"],
    targetPool: ["FitTrackee 运动记录"],
    minTargetMatches: 1,
    mustCover: ["workout-planning", "workout-tracking"],
    forbidden: ["Open-Meteo 天气服务", "MoneyPrinterTurbo", "akshare"]
  },
  {
    name: "植物物种识别",
    prompt: "我想开发一个植物识别软件",
    mustInclude: ["AI Taxonomist 植物识别组件"],
    targetPool: ["PlantNet-300K 植物图像数据集", "HortusFox 植物管理系统", "Pl@ntNet 植物识别 API 示例"],
    minTargetMatches: 2,
    mustCover: ["plant-species-identification", "plant-species-dataset"],
    forbidden: ["PlantVillage 植物病害数据集", "Plant-Disease-Detection", "MoneyPrinterTurbo"]
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
        matchedCapabilities: item.matchedCapabilityIds,
        risk: item.resource.risk_level,
        trust: item.resource.trust_score,
        why: item.why,
        alternative: item.alternative
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
    const duplicateNames = names.filter((name, index) => names.indexOf(name) !== index);
    if (duplicateNames.length > 0) {
      failures.push(`${testCase.name}: 重复推荐 ${Array.from(new Set(duplicateNames)).join(", ")}`);
    }

    const defaultItems = items.filter((item) => item.group !== "risk-alerts");
    const misplacedHighRisk = defaultItems.filter((item) => item.risk === "high");
    if (misplacedHighRisk.length > 0) {
      failures.push(`${testCase.name}: 高风险资源进入默认方案 ${misplacedHighRisk.map((item) => item.name).join(", ")}`);
    }
    const weakMediumRisk = defaultItems.filter((item) => item.risk === "medium" && item.trust < 65);
    if (weakMediumRisk.length > 0) {
      failures.push(`${testCase.name}: 低可信中风险资源进入默认方案 ${weakMediumRisk.map((item) => item.name).join(", ")}`);
    }

    const groupNames = new Map<string, Set<string>>();
    items.forEach((item) => {
      const entries = groupNames.get(item.group) ?? new Set<string>();
      entries.add(item.name.toLowerCase());
      groupNames.set(item.group, entries);
    });
    const unrelatedAlternatives = defaultItems.filter((item) =>
      item.alternative !== "暂无同类低风险替代项。"
      && !groupNames.get(item.group)?.has(item.alternative.toLowerCase())
    );
    if (unrelatedAlternatives.length > 0) {
      failures.push(`${testCase.name}: 替代项不在同组候选中 ${unrelatedAlternatives
        .map((item) => `${item.name}->${item.alternative}`)
        .join(", ")}`);
    }

    const verboseReasons = items.filter((item) =>
      item.why.length > 90
      || /本次方案适配度|风险依据|GitHub Stars|资源基础质量|旧模型声明类型|接入前/.test(item.why)
    );
    if (verboseReasons.length > 0) {
      failures.push(`${testCase.name}: 推荐说明冗长或泄漏内部证据 ${verboseReasons.map((item) => item.name).join(", ")}`);
    }
    const domainReasons = items
      .filter((item) => item.name.toLowerCase() !== "shadcn/ui")
      .map((item) => item.why);
    const duplicateReasons = domainReasons.filter((reason, index) => domainReasons.indexOf(reason) !== index);
    if (duplicateReasons.length > 0) {
      failures.push(`${testCase.name}: 不同领域资源使用了重复说明`);
    }

    const capabilityLabels = new Map(
      capabilityGraph.capabilities.map((capability) => [capability.id, capability.label])
    );
    const falseGapLabels = testCase.mustCover
      .map((id) => capabilityLabels.get(id))
      .filter((label): label is string => Boolean(label))
      .filter((label) => result.recommendation.gaps.some((gap) => gap.includes(`“${label}”`)));
    if (falseGapLabels.length > 0) {
      failures.push(`${testCase.name}: 已覆盖能力仍被报告为缺口 ${falseGapLabels.join(", ")}`);
    }

    return {
      name: testCase.name,
      projectType: result.analysis.projectType,
      capabilities: capabilityGraph.capabilities.map((capability) => capability.id),
      targetMatches,
      missing,
      forbiddenMatches,
      gaps: result.recommendation.gaps,
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
