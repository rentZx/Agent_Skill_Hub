import { assessRiskLevel } from "./github-import";
import {
  isGenericCapabilityId,
  type CapabilityRequirement
} from "./capability-engine";
import type { Resource, ResourceType, RiskLevel } from "./types";

type GitHubSearchItem = {
  full_name: string;
  name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  topics?: string[];
  language: string | null;
  license: { spdx_id: string | null } | null;
  archived: boolean;
  pushed_at: string | null;
  default_branch?: string;
};

type DiscoveryContext = {
  capabilities?: CapabilityRequirement[];
  searchQueries?: string[];
};

type RepositoryEvidence = {
  hasSkillMd: boolean;
  hasMcpManifest: boolean;
  hasPackageJson: boolean;
  hasProjectManifest: boolean;
  hasGitHubAction: boolean;
  hasDatasetEvidence: boolean;
  hasReusableUi: boolean;
  matchedCapabilities: string[];
  evidenceFiles: string[];
  summary: string;
};

type DiscoveryProfile = {
  queries: string[];
  repositories: string[];
  relevanceTerms: string[];
  typeOverrides: Record<string, ResourceType>;
  tagOverrides: Record<string, string[]>;
  riskOverrides?: Record<string, { level: RiskLevel; reason: string; license?: string }>;
};

const shortVideoDiscoveryProfile: DiscoveryProfile = {
  queries: [
    "\"AI short video generator\" subtitles voiceover in:name,description,readme archived:false fork:false",
    "\"text to video\" FFmpeg MoviePy in:name,description,readme archived:false fork:false",
    "\"automated video creation\" TTS captions in:name,description,readme archived:false fork:false",
    "\"vertical video\" script footage subtitles in:name,description,readme archived:false fork:false"
  ],
  repositories: [
    "harry0703/MoneyPrinterTurbo",
    "calesthio/OpenMontage",
    "gyoridavid/short-video-maker",
    "SamurAIGPT/Text-To-Video-AI",
    "FujiwaraChoki/MoneyPrinter"
  ],
  relevanceTerms: [
    "ai short video generator", "short video generation", "text-to-video", "script generation",
    "stock footage", "text-to-speech", "automatic subtitles", "video composition", "vertical video"
  ],
  typeOverrides: {
    "harry0703/moneyprinterturbo": "template_repo",
    "calesthio/openmontage": "agent_skill",
    "gyoridavid/short-video-maker": "mcp_server",
    "samuraigpt/text-to-video-ai": "template_repo",
    "fujiwarachoki/moneyprinter": "template_repo"
  },
  tagOverrides: {
    "harry0703/moneyprinterturbo": ["ai-video-generator", "short-video", "text-to-video", "script-generation", "stock-footage", "text-to-speech", "subtitles", "video-composition", "moviepy", "ffmpeg", "vertical-video"],
    "calesthio/openmontage": ["agent-skill", "short-video", "script-generation", "asset-generation", "text-to-speech", "captions", "video-editing", "video-rendering", "remotion", "ffmpeg"],
    "gyoridavid/short-video-maker": ["mcp-server", "short-video", "text-to-video", "text-to-speech", "captions", "background-video", "video-composition", "vertical-video"],
    "samuraigpt/text-to-video-ai": ["text-to-video", "script-generation", "text-to-speech", "stock-footage", "captions", "vertical-video", "ffmpeg"],
    "fujiwarachoki/moneyprinter": ["ai-video-generator", "short-video", "script-generation", "stock-footage", "text-to-speech", "subtitles", "video-composition"]
  }
};

const inventoryVoiceDiscoveryProfile: DiscoveryProfile = {
  queries: [
    "\"inventory management\" \"stock location\" in:name,description,readme archived:false fork:false",
    "\"retail inventory\" \"item pricing\" in:name,description,readme archived:false fork:false",
    "\"Chinese ASR\" streaming speech-to-text in:name,description,readme archived:false fork:false",
    "\"speech recognition\" transcription in:name,description,readme archived:false fork:false"
  ],
  repositories: [
    "frappe/erpnext",
    "inventree/InvenTree",
    "modelscope/FunASR",
    "SYSTRAN/faster-whisper",
    "crystaldba/postgres-mcp"
  ],
  relevanceTerms: [
    "inventory management", "stock control", "warehouse location", "product catalog", "item pricing",
    "speech-to-text", "automatic speech recognition", "chinese asr", "streaming asr", "voice transcription"
  ],
  typeOverrides: {
    "frappe/erpnext": "template_repo",
    "inventree/inventree": "template_repo",
    "modelscope/funasr": "github_plugin",
    "systran/faster-whisper": "github_plugin",
    "crystaldba/postgres-mcp": "mcp_server"
  },
  tagOverrides: {
    "frappe/erpnext": ["inventory-management", "stock-control", "warehouse-location", "product-catalog", "item-pricing", "erp", "retail"],
    "inventree/inventree": ["inventory-management", "stock-control", "warehouse-location", "product-catalog", "item-pricing", "inventory-api"],
    "modelscope/funasr": ["speech-to-text", "automatic-speech-recognition", "chinese-asr", "streaming-asr", "voice-transcription"],
    "systran/faster-whisper": ["speech-to-text", "automatic-speech-recognition", "voice-transcription", "whisper"],
    "crystaldba/postgres-mcp": ["database-mcp", "postgres-mcp", "sql-tool", "natural-language-query", "database-analysis"]
  }
};

const stockDiscoveryProfile: DiscoveryProfile = {
  queries: [
    "\"stock analysis\" \"market data\" in:name,description,readme archived:false fork:false",
    "\"A-share\" \"financial data\" in:name,description,readme archived:false fork:false",
    "\"quantitative trading\" backtesting in:name,description,readme archived:false fork:false",
    "\"financial charts\" library in:name,description,readme archived:false fork:false"
  ],
  repositories: [
    "ZhuLinsen/daily_stock_analysis",
    "akfamily/akshare",
    "mootdx/mootdx",
    "microsoft/qlib",
    "ricequant/rqalpha",
    "hsliuping/TradingAgents-CN",
    "tradingview/lightweight-charts"
  ],
  relevanceTerms: [
    "stock analysis", "stock market", "market data", "financial data", "real-time quotes", "a-share",
    "technical analysis", "quantitative trading", "backtesting", "trading strategy", "financial charts"
  ],
  typeOverrides: {
    "zhulinsen/daily_stock_analysis": "agent_skill",
    "tradingview/lightweight-charts": "ui_component"
  },
  tagOverrides: {
    "zhulinsen/daily_stock_analysis": ["stock-market", "market-data", "real-time-quotes", "technical-analysis", "quantitative-trading", "agent-skill"],
    "akfamily/akshare": ["financial-data", "a-share", "market-data", "stock-market"],
    "mootdx/mootdx": ["market-data", "real-time-quotes", "a-share", "tongdaxin"],
    "microsoft/qlib": ["quantitative-trading", "quant-research", "machine-learning", "backtesting"],
    "ricequant/rqalpha": ["backtesting", "algorithmic-trading", "a-share", "trading-strategy"],
    "hsliuping/tradingagents-cn": ["multi-agent-research", "stock-analysis", "quantitative-trading", "stock-market"],
    "tradingview/lightweight-charts": ["financial-charts", "candlestick", "ui", "stock-market"]
  }
};

const recipeDiscoveryProfile: DiscoveryProfile = {
  queries: [
    "\"recipe recommendation\" ingredients nutrition in:name,description,readme archived:false fork:false",
    "\"chinese recipes\" \"cooking steps\" in:name,description,readme archived:false fork:false",
    "\"recipe mcp\" server in:name,description,readme archived:false fork:false",
    "\"personalized nutrition\" age dietary in:name,description,readme archived:false fork:false"
  ],
  repositories: [
    "Anduin2017/HowToCook",
    "worryzyy/HowToCook-mcp",
    "chitralputhran/Recipe-AI-Easy-Recipes",
    "mealie-recipes/mealie",
    "TandoorRecipes/recipes",
    "grocy/grocy",
    "magedbekheet/macrochefai",
    "ShreyaKumar-dev/Caloriet"
  ],
  relevanceTerms: [
    "recipe recommendation", "chinese recipes", "ingredients", "cooking steps", "servings", "portion scaling",
    "dietary restrictions", "food allergies", "personalized nutrition", "age", "meal planning", "recipe mcp"
  ],
  typeOverrides: {
    "anduin2017/howtocook": "template_repo",
    "worryzyy/howtocook-mcp": "mcp_server",
    "chitralputhran/recipe-ai-easy-recipes": "template_repo",
    "mealie-recipes/mealie": "template_repo",
    "tandoorrecipes/recipes": "template_repo",
    "grocy/grocy": "template_repo",
    "magedbekheet/macrochefai": "template_repo",
    "shreyakumar-dev/caloriet": "template_repo"
  },
  tagOverrides: {
    "anduin2017/howtocook": ["chinese-recipes", "recipe", "ingredients", "cooking-steps", "recipe-dataset"],
    "worryzyy/howtocook-mcp": ["recipe-mcp", "chinese-recipes", "recipe", "ingredients", "cooking-steps"],
    "chitralputhran/recipe-ai-easy-recipes": ["ingredient-recommendation", "recipe", "cooking-steps", "nutrition", "shopping-list"],
    "mealie-recipes/mealie": ["recipe", "meal-planning", "shopping-list", "servings", "recipe-import"],
    "tandoorrecipes/recipes": ["recipe", "meal-planning", "shopping-list", "ingredients", "servings"],
    "grocy/grocy": ["ingredients", "pantry", "meal-planning", "shopping-list", "food-inventory"],
    "magedbekheet/macrochefai": ["personalized-nutrition", "age-aware", "ingredient-recommendation", "dietary-restrictions", "food-allergies", "health-conditions"],
    "shreyakumar-dev/caloriet": ["personalized-nutrition", "age-aware", "dietary-restrictions", "ingredient-recommendation", "nutrition"]
  },
  riskOverrides: {
    "tandoorrecipes/recipes": {
      level: "medium",
      license: "AGPL-3.0 + Commons Clause selling exception",
      reason: "仓库采用 GNU AGPL v3，并附带 Commons Clause 销售例外；商业托管、销售和分发边界需要在接入前复核。"
    }
  }
};

const plantIdentificationDiscoveryProfile: DiscoveryProfile = {
  queries: [
    "\"plant identification\" species image API in:name,description,readme archived:false fork:false",
    "\"plant species recognition\" image classification in:name,description,readme archived:false fork:false",
    "\"Pl@ntNet API\" plant identification in:name,description,readme archived:false fork:false"
  ],
  repositories: [
    "plantnet/my.plantnet",
    "plantnet/ai-taxonomist-webcomponent",
    "plantnet/PlantNet-300K",
    "danielbrendel/hortusfox-web"
  ],
  relevanceTerms: [
    "plant identification", "plant species recognition", "plant image classification",
    "species classification", "plantnet api", "ai taxonomist", "plant image dataset"
  ],
  typeOverrides: {
    "plantnet/my.plantnet": "github_plugin",
    "plantnet/ai-taxonomist-webcomponent": "ui_component",
    "plantnet/plantnet-300k": "github_plugin",
    "danielbrendel/hortusfox-web": "template_repo"
  },
  tagOverrides: {
    "plantnet/my.plantnet": ["plant-identification", "plant-species-recognition", "plant-identification-api", "plantnet-api", "image-upload", "species-classification"],
    "plantnet/ai-taxonomist-webcomponent": ["plant-identification", "plant-species-recognition", "plant-identification-api", "ai-taxonomist", "web-component", "image-upload", "species-classification", "ui"],
    "plantnet/plantnet-300k": ["plant-identification", "plant-species-recognition", "plant-image-dataset", "plant-species-dataset", "species-classification", "deep-learning", "pytorch"],
    "danielbrendel/hortusfox-web": ["plant-management", "plant-identification", "plantnet-api", "plant-care", "self-hosted", "project-template"]
  }
};

const plantDiseaseDiscoveryProfile: DiscoveryProfile = {
  queries: [
    "\"plant disease detection\" leaf image classification in:name,description,readme archived:false fork:false",
    "\"crop disease\" PlantVillage model in:name,description,readme archived:false fork:false"
  ],
  repositories: [
    "spMohanty/PlantVillage-Dataset"
  ],
  relevanceTerms: [
    "plant disease detection", "leaf disease classification", "crop disease recognition",
    "plant pathology", "plant disease dataset", "plantvillage"
  ],
  typeOverrides: {
    "spmohanty/plantvillage-dataset": "github_plugin"
  },
  tagOverrides: {
    "spmohanty/plantvillage-dataset": ["plant-disease-detection", "plant-disease-dataset", "leaf-disease", "crop-disease", "plant-pathology", "image-classification"]
  }
};

const weatherDiscoveryProfile: DiscoveryProfile = {
  queries: [
    "\"weather API\" forecast historical in:name,description,readme archived:false fork:false",
    "\"weather forecast\" hourly daily API in:name,description,readme archived:false fork:false"
  ],
  repositories: ["open-meteo/open-meteo"],
  relevanceTerms: [
    "weather api", "weather forecast", "current weather", "hourly forecast",
    "daily forecast", "historical weather", "climate data"
  ],
  typeOverrides: {
    "open-meteo/open-meteo": "github_plugin"
  },
  tagOverrides: {
    "open-meteo/open-meteo": ["weather-api", "weather-forecast", "current-weather", "hourly-forecast", "historical-weather", "climate-data"]
  }
};

const nutritionTrackingDiscoveryProfile: DiscoveryProfile = {
  queries: [
    "\"food diary\" nutrition tracker barcode in:name,description,readme archived:false fork:false",
    "\"calorie tracker\" \"Open Food Facts\" in:name,description,readme archived:false fork:false"
  ],
  repositories: [
    "openfoodfacts/openfoodfacts-server",
    "simonoppowa/OpenNutriTracker",
    "maksimowiczm/FoodYou",
    "wger-project/wger"
  ],
  relevanceTerms: [
    "food diary", "meal logging", "nutrition tracker", "calorie tracker",
    "nutrition database", "barcode food lookup", "open food facts"
  ],
  typeOverrides: {
    "openfoodfacts/openfoodfacts-server": "github_plugin",
    "simonoppowa/opennutritracker": "template_repo",
    "maksimowiczm/foodyou": "template_repo",
    "wger-project/wger": "template_repo"
  },
  tagOverrides: {
    "openfoodfacts/openfoodfacts-server": ["nutrition-database", "food-products", "allergens", "barcode-food-lookup", "open-food-facts"],
    "simonoppowa/opennutritracker": ["food-diary", "nutrition-tracker", "calorie-tracker", "barcode-food-lookup", "open-food-facts"],
    "maksimowiczm/foodyou": ["food-diary", "meal-logging", "nutrition-tracker", "calorie-tracker"],
    "wger-project/wger": ["workout-planning", "workout-tracking", "nutrition-tracker", "body-measurements", "weight-tracker"]
  }
};

const fitnessTrackingDiscoveryProfile: DiscoveryProfile = {
  queries: [
    "\"workout tracker\" self-hosted in:name,description,readme archived:false fork:false",
    "\"fitness tracker\" workout planning body measurements in:name,description,readme archived:false fork:false"
  ],
  repositories: [
    "wger-project/wger",
    "SamR1/FitTrackee",
    "felixrieseberg/claude-coach"
  ],
  relevanceTerms: [
    "workout planning", "workout routines", "workout tracker", "fitness tracker",
    "activity tracker", "exercise log", "body measurements", "weight tracker"
  ],
  typeOverrides: {
    "wger-project/wger": "template_repo",
    "samr1/fittrackee": "template_repo",
    "felixrieseberg/claude-coach": "agent_skill"
  },
  tagOverrides: {
    "wger-project/wger": ["workout-planning", "workout-tracking", "nutrition-tracker", "body-measurements", "weight-tracker"],
    "samr1/fittrackee": ["workout-tracking", "activity-tracker", "fitness-tracker", "gps-tracking"],
    "felixrieseberg/claude-coach": ["agent-skill", "fitness-coach", "training-plan", "workout-planning", "endurance"]
  }
};

const vehicleRoutingDiscoveryProfile: DiscoveryProfile = {
  queries: [
    "\"vehicle routing problem\" capacity \"time windows\" in:name,description,readme archived:false fork:false",
    "\"route optimization\" delivery fleet vrptw in:name,description,readme archived:false fork:false"
  ],
  repositories: [
    "VROOM-Project/vroom",
    "PyVRP/PyVRP",
    "google/or-tools",
    "graphhopper/jsprit",
    "N-Wouda/ALNS"
  ],
  relevanceTerms: [
    "vehicle routing problem", "vrp", "vrptw", "route optimization", "fleet routing",
    "vehicle capacity", "time windows", "pickup delivery", "delivery scheduling"
  ],
  typeOverrides: {
    "vroom-project/vroom": "template_repo",
    "pyvrp/pyvrp": "template_repo",
    "google/or-tools": "template_repo",
    "graphhopper/jsprit": "template_repo",
    "n-wouda/alns": "template_repo"
  },
  tagOverrides: {
    "vroom-project/vroom": ["vehicle-routing", "route-optimization", "vrp", "vrptw", "vehicle-capacity", "time-windows", "pickup-delivery"],
    "pyvrp/pyvrp": ["vehicle-routing", "route-optimization", "vrp", "vrptw", "vehicle-capacity", "time-windows", "multi-depot"],
    "google/or-tools": ["operations-research", "vehicle-routing", "route-optimization", "vrp", "constraint-programming"],
    "graphhopper/jsprit": ["vehicle-routing", "route-optimization", "vrp", "vrptw", "vehicle-capacity", "time-windows"],
    "n-wouda/alns": ["optimization", "vehicle-routing", "routing-algorithm", "operations-research"]
  }
};

const imageTo3dDiscoveryProfile: DiscoveryProfile = {
  queries: [
    "\"image to 3d\" threejs in:name,description,readme archived:false fork:false",
    "\"single image\" \"3d model\" reconstruction in:name,description,readme archived:false fork:false"
  ],
  repositories: [
    "img2threejs/img2threejs",
    "Stability-AI/stable-fast-3d",
    "TencentARC/InstantMesh",
    "VAST-AI-Research/TripoSR"
  ],
  relevanceTerms: [
    "image to 3d", "single image 3d", "threejs", "depth estimation", "mesh generation",
    "3d reconstruction", "model viewer"
  ],
  typeOverrides: {
    "img2threejs/img2threejs": "agent_skill",
    "stability-ai/stable-fast-3d": "template_repo",
    "tencentarc/instantmesh": "template_repo",
    "vast-ai-research/triposr": "template_repo"
  },
  tagOverrides: {
    "img2threejs/img2threejs": ["image-to-3d", "threejs", "webgl", "procedural-generation", "agent-skill"],
    "stability-ai/stable-fast-3d": ["image-to-3d", "3d-reconstruction", "mesh-generation"],
    "tencentarc/instantmesh": ["image-to-3d", "3d-reconstruction", "mesh-generation"],
    "vast-ai-research/triposr": ["image-to-3d", "3d-reconstruction", "mesh-generation"]
  }
};

export async function discoverGitHubResources(
  input: string,
  tags: string[],
  existing: Resource[],
  context: DiscoveryContext = {}
): Promise<Resource[]> {
  const profile = getDiscoveryProfile(input, tags);
  const queries = buildPlannedQueries(
    input,
    tags,
    context.searchQueries ?? [],
    context.capabilities ?? [],
    profile
  );
  const [initialResults, preferredResults] = await Promise.all([
    Promise.all(queries.map((query) => searchRepositories(query))),
    Promise.all((profile?.repositories ?? []).map((repository) => fetchRepository(repository)))
  ]);
  let results = initialResults;
  if (results.flat().length < 12) {
    const fallbackQuery = buildFallbackQuery(input, tags);
    if (fallbackQuery && !queries.includes(fallbackQuery)) {
      results = [...results, await searchRepositories(fallbackQuery, 12)];
    }
  }
  const existingUrls = new Set(existing.map((resource) => resource.repo_url).filter(Boolean));
  const preferredNames = new Set((profile?.repositories ?? []).map((repository) => repository.toLowerCase()));
  const unique = new Map<string, GitHubSearchItem>();

  results.flat().forEach((item) => {
    if (!existingUrls.has(item.html_url) || preferredNames.has(item.full_name.toLowerCase())) {
      unique.set(item.full_name.toLowerCase(), item);
    }
  });
  preferredResults.filter((item): item is GitHubSearchItem => Boolean(item)).forEach((item) => {
    unique.set(item.full_name.toLowerCase(), item);
  });

  const relevanceTerms = Array.from(new Set([
    ...getDiscoveryTerms(input, tags),
    ...(profile?.relevanceTerms ?? []),
    ...(context.searchQueries ?? []),
    ...(context.capabilities ?? []).flatMap((capability) => capability.keywords)
  ]));
  const ranked = Array.from(unique.values())
    .sort((left, right) =>
      scoreRepositoryRelevance(right, relevanceTerms, preferredNames) -
      scoreRepositoryRelevance(left, relevanceTerms, preferredNames)
    )
    .slice(0, 24);
  const inspectionLimit = profile ? 6 : 12;
  const evidenceEntries = await Promise.all(
    ranked.slice(0, inspectionLimit).map(async (item) => [
      item.full_name.toLowerCase(),
      await inspectRepository(item, context.capabilities ?? [])
    ] as const)
  );
  const evidenceByRepository = new Map(evidenceEntries);

  return ranked
    .filter((item) => {
      if (profile) return true;
      const evidence = evidenceByRepository.get(item.full_name.toLowerCase());
      return evidence ? hasColdStartEvidence(evidence) : false;
    })
    .map((item) => {
      const key = item.full_name.toLowerCase();
      return toResource(item, tags, {
        typeOverride: profile?.typeOverrides[key],
        tagOverrides: profile?.tagOverrides[key],
        recommendationWeight: preferredNames.has(key) ? 100 : undefined,
        riskOverride: profile?.riskOverrides?.[key],
        evidence: evidenceByRepository.get(key)
      });
    });
}

export async function discoverTopAiResources(limit = 30): Promise<Resource[]> {
  const queries = [
    "AI plugin in:name,description,readme archived:false fork:false",
    "MCP AI in:name,description,readme archived:false fork:false",
    "agent skill AI in:name,description,readme archived:false fork:false",
    "LLM extension in:name,description,readme archived:false fork:false"
  ];
  const results = await Promise.all(queries.map((query) => searchRepositories(query, 100)));
  const unique = new Map<string, GitHubSearchItem>();
  results.flat().filter(isAiPluginLike).forEach((item) => unique.set(item.full_name, item));
  return Array.from(unique.values())
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, limit)
    .map((item) => ({ ...toResource(item, ["ai", "github", "plugin"]), source: "github_top_ai" }));
}

function buildQueries(input: string, tags: string[]) {
  const focusedTags = getDiscoveryTerms(input, tags).slice(0, 5);
  const inputTerms = input.match(/[a-z0-9][a-z0-9-]{1,}/gi)?.map((term) => term.toLowerCase()) ?? [];
  const focusedQueries = focusedTags.map(
    (tag) => `${quoteSearchTerm(tag)} in:name,description,readme archived:false fork:false`
  );
  const inputQuery = inputTerms.length > 0
    ? `${inputTerms.slice(0, 4).map(quoteSearchTerm).join(" ")} in:name,description,readme archived:false fork:false`
    : "";

  return Array.from(new Set([...focusedQueries, inputQuery])).filter(Boolean).slice(0, 6);
}

function buildPlannedQueries(
  input: string,
  tags: string[],
  searchQueries: string[],
  capabilities: CapabilityRequirement[],
  profile: DiscoveryProfile | null
) {
  const normalizedPlanned = searchQueries
    .map((query) => query.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const planned = normalizedPlanned
    .map((query) => `${query} in:name,description,readme archived:false fork:false`);
  const relaxedPlanned = normalizedPlanned
    .map(buildRelaxedSearchTerm)
    .filter(Boolean)
    .map((query) => `${query} in:name,description,readme archived:false fork:false`);
  const profileQueries = profile?.queries.slice(0, 2) ?? [];
  const adaptiveQueries = profile ? [] : buildColdStartQueries(capabilities);
  const fallbackQueries = buildQueries(input, tags);
  if (profile) {
    return Array.from(new Set([
      ...planned,
      ...profileQueries,
      ...fallbackQueries
    ])).slice(0, 6);
  }
  return interleaveQueries(
    planned,
    relaxedPlanned,
    adaptiveQueries,
    fallbackQueries
  ).slice(0, 8);
}

function interleaveQueries(...groups: string[][]) {
  const result: string[] = [];
  const seen = new Set<string>();
  const maxLength = Math.max(0, ...groups.map((group) => group.length));
  for (let index = 0; index < maxLength; index += 1) {
    for (const group of groups) {
      const query = group[index];
      if (!query || seen.has(query)) continue;
      seen.add(query);
      result.push(query);
    }
  }
  return result;
}

function buildColdStartQueries(capabilities: CapabilityRequirement[]) {
  const ranked = capabilities
    .filter((capability) => capability.priority !== "optional")
    .filter((capability) => !isGenericCapabilityId(capability.id))
    .sort((left, right) => capabilityPriority(right.priority) - capabilityPriority(left.priority))
    .map((capability) => {
      const keywords = capability.keywords
        .map((keyword) => keyword.toLowerCase().trim())
        .filter(isSpecificDiscoveryKeyword)
        .slice(0, 2);
      return { primary: keywords[0] ?? "", secondary: keywords[1] ?? "" };
    })
    .filter((entry) => entry.primary);
  const terms = [
    ...ranked.map((entry) => quoteSearchTerm(entry.primary)),
    ...ranked.map((entry) => buildRelaxedSearchTerm(entry.primary)),
    ...ranked.map((entry) => entry.secondary ? quoteSearchTerm(entry.secondary) : "")
  ];
  return Array.from(new Set(terms))
    .filter(Boolean)
    .slice(0, 6)
    .map((query) => `${query} in:name,description,readme archived:false fork:false`);
}

function buildRelaxedSearchTerm(keyword: string) {
  const tokens = keyword
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && !genericCapabilityTokens.has(token));
  return tokens.length >= 2 ? tokens.slice(0, 3).join(" ") : "";
}

function isSpecificDiscoveryKeyword(keyword: string) {
  const normalized = keyword.replace(/[-_]+/g, " ").trim();
  if (normalized.length < 5 || normalized.length > 64) return false;
  return ![
    "api", "app", "application", "ai", "agent", "database", "frontend", "backend",
    "management", "platform", "software", "system", "tool", "web"
  ].includes(normalized);
}

function capabilityPriority(priority: CapabilityRequirement["priority"]) {
  return priority === "core" ? 3 : priority === "required" ? 2 : 1;
}

function buildFallbackQuery(input: string, tags: string[]) {
  return getDiscoveryTerms(input, tags).slice(0, 3).map(quoteSearchTerm).join(" ");
}

async function searchRepositories(query: string, perPage = 15): Promise<GitHubSearchItem[]> {
  const headers: HeadersInit = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  try {
    const response = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${perPage}`, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) {
      console.warn(`GitHub discovery search failed: ${response.status}`);
      return [];
    }
    const payload = (await response.json()) as { items?: GitHubSearchItem[] };
    return payload.items ?? [];
  } catch (error) {
    console.warn("GitHub discovery search timed out.", error);
    return [];
  }
}

async function fetchRepository(fullName: string): Promise<GitHubSearchItem | null> {
  const headers: HeadersInit = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const repositoryPath = fullName.split("/").map(encodeURIComponent).join("/");
  try {
    const response = await fetch(`https://api.github.com/repos/${repositoryPath}`, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) {
      console.warn(`GitHub discovery failed for repository ${fullName}: ${response.status}`);
      return null;
    }
    return await response.json() as GitHubSearchItem;
  } catch (error) {
    console.warn(`GitHub discovery timed out for repository ${fullName}.`, error);
    return null;
  }
}

const repositoryInspectionCache = new Map<string, {
  expiresAt: number;
  value: Promise<{ paths: string[]; readme: string }>;
}>();

async function inspectRepository(
  item: GitHubSearchItem,
  capabilities: CapabilityRequirement[]
): Promise<RepositoryEvidence> {
  const inspection = await getRepositoryInspection(item);
  const normalizedPaths = inspection.paths.map((path) => path.toLowerCase());
  const hasSkillMd = normalizedPaths.some((path) => /(^|\/)skill\.md$/.test(path));
  const hasPackageJson = normalizedPaths.some((path) => /(^|\/)package\.json$/.test(path));
  const hasProjectManifest = normalizedPaths.some((path) =>
    /(^|\/)(package\.json|pyproject\.toml|requirements\.txt|cargo\.toml|go\.mod|pom\.xml|composer\.json)$/.test(path)
  );
  const hasGitHubAction = normalizedPaths.some((path) =>
    /(^|\/)action\.ya?ml$/.test(path) || /^\.github\/actions\/[^/]+\/action\.ya?ml$/.test(path)
  );
  const mcpReadme = inspection.readme.slice(0, 12000);
  const hasMcpManifest = normalizedPaths.some((path) =>
    /(^|\/)(mcp\.json|\.mcp\.json|mcp-server\.json|server\.json)$/.test(path)
  ) || (
    /\b(model context protocol|mcp server)\b/i.test(mcpReadme)
    && /\b(mcpservers|stdio|tools\/list|npx|uvx|server transport)\b/i.test(mcpReadme)
  );
  const evidenceSource = [
    item.name,
    item.description ?? "",
    ...(item.topics ?? []),
    ...inspection.paths.slice(0, 500),
    inspection.readme.slice(0, 24000)
  ].join(" ").toLowerCase();
  const hasDatasetEvidence = /\b(dataset|training data|benchmark dataset|annotated images?|annotations?)\b/i.test(evidenceSource)
    && normalizedPaths.some((path) =>
      /(^|\/)(data|dataset|datasets|annotations?)(\/|$)/.test(path)
      || /\.(csv|jsonl|parquet|tfrecord|arrow)$/.test(path)
    );
  const hasReusableUi = hasPackageJson
    && /\b(component library|web[- ]?component|ui library|design system|react components?|vue components?|svelte components?)\b/i.test(evidenceSource);
  const matched = capabilities.filter((capability) =>
    capability.keywords.some((keyword) => matchesCapabilityKeyword(evidenceSource, keyword))
    && !capability.negativeKeywords.some((keyword) => matchesEvidenceTerm(evidenceSource, keyword))
    && !hasCapabilityConflict(evidenceSource, capability)
  );
  const evidenceFiles = inspection.paths.filter((path) =>
    /(^|\/)(skill\.md|package\.json|pyproject\.toml|requirements\.txt|cargo\.toml|go\.mod|pom\.xml|composer\.json|action\.ya?ml|mcp\.json|\.mcp\.json|readme\.md)$/i.test(path)
  ).slice(0, 8);
  const signals = [
    hasSkillMd ? "检测到 SKILL.md" : "",
    hasMcpManifest ? "检测到 MCP Server 或配置清单" : "",
    hasPackageJson ? "检测到 package.json" : "",
    hasProjectManifest && !hasPackageJson ? "检测到项目清单" : "",
    hasGitHubAction ? "检测到 GitHub Action" : "",
    hasDatasetEvidence ? "检测到数据集说明和数据文件" : "",
    hasReusableUi ? "检测到可复用 UI 组件" : "",
    matched.length > 0 ? `README/文件命中能力：${matched.map((capability) => capability.label).join("、")}` : ""
  ].filter(Boolean);

  return {
    hasSkillMd,
    hasMcpManifest,
    hasPackageJson,
    hasProjectManifest,
    hasGitHubAction,
    hasDatasetEvidence,
    hasReusableUi,
    matchedCapabilities: matched.map((capability) => capability.id),
    evidenceFiles,
    summary: signals.length > 0 ? `仓库证据：${signals.join("；")}。` : "仓库证据：未检测到明确的 Skill、MCP 或核心能力文件信号。"
  };
}

function hasColdStartEvidence(evidence: RepositoryEvidence) {
  if (!evidence.matchedCapabilities.some((id) => !isGenericCapabilityId(id))) return false;
  return evidence.hasSkillMd
    || evidence.hasMcpManifest
    || evidence.hasPackageJson
    || evidence.hasProjectManifest
    || evidence.hasGitHubAction
    || evidence.hasDatasetEvidence
    || evidence.hasReusableUi;
}

async function getRepositoryInspection(item: GitHubSearchItem) {
  const key = item.full_name.toLowerCase();
  const cached = repositoryInspectionCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const value = Promise.all([
    fetchRepositoryTree(item.full_name, item.default_branch ?? "main"),
    fetchRepositoryReadme(item.full_name)
  ]).then(([paths, readme]) => ({ paths, readme }));

  if (repositoryInspectionCache.size >= 200) {
    const oldest = repositoryInspectionCache.keys().next().value;
    if (oldest) repositoryInspectionCache.delete(oldest);
  }
  repositoryInspectionCache.set(key, { expiresAt: Date.now() + 60 * 60 * 1000, value });
  return value;
}

async function fetchRepositoryTree(fullName: string, branch: string) {
  const headers: HeadersInit = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const repositoryPath = fullName.split("/").map(encodeURIComponent).join("/");
  try {
    const response = await fetch(
      `https://api.github.com/repos/${repositoryPath}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
      { headers, cache: "no-store", signal: AbortSignal.timeout(5000) }
    );
    if (!response.ok) return [];
    const payload = await response.json() as { tree?: Array<{ path?: string; type?: string }> };
    return (payload.tree ?? [])
      .filter((entry) => entry.type === "blob" && typeof entry.path === "string")
      .map((entry) => entry.path as string);
  } catch {
    return [];
  }
}

async function fetchRepositoryReadme(fullName: string) {
  const headers: HeadersInit = { Accept: "application/vnd.github.raw+json", "X-GitHub-Api-Version": "2022-11-28" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const repositoryPath = fullName.split("/").map(encodeURIComponent).join("/");
  try {
    const response = await fetch(`https://api.github.com/repos/${repositoryPath}/readme`, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) return "";
    return (await response.text()).slice(0, 40000);
  } catch {
    return "";
  }
}

function matchesEvidenceTerm(source: string, term: string) {
  const normalized = term.toLowerCase().trim();
  if (normalized.length < 3) return false;
  const normalizedSource = source.replace(/[-_]+/g, " ");
  const normalizedTerm = normalized.replace(/[-_]+/g, " ");
  return source.includes(normalized) || normalizedSource.includes(normalizedTerm);
}

const genericCapabilityTokens = new Set([
  "api", "app", "application", "classification", "data", "dataset", "detection",
  "framework", "identification", "library", "management", "model", "open", "platform",
  "recognition", "service", "software", "system", "tool"
]);

function matchesCapabilityKeyword(source: string, keyword: string) {
  if (matchesEvidenceTerm(source, keyword)) return true;

  const tokens = keyword
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && !genericCapabilityTokens.has(token));
  if (tokens.length < 2) return false;

  const sourceTokens = source.split(/[^a-z0-9]+/).filter(Boolean);
  const matchedTokens = tokens.filter((token) =>
    sourceTokens.some((sourceToken) =>
      sourceToken === token
      || (Math.min(sourceToken.length, token.length) >= 6
        && (sourceToken.startsWith(token) || token.startsWith(sourceToken)))
    )
  );
  return matchedTokens.length >= 2;
}

function hasCapabilityConflict(source: string, capability: CapabilityRequirement) {
  const capabilitySource = `${capability.id} ${capability.label} ${capability.keywords.join(" ")}`.toLowerCase();
  const classificationCapability = /(classification|recognition|identification|detection|classifier)/.test(capabilitySource);
  const speechSynthesisRepository = /\b(text[- ]to[- ]speech|speech synthesis|voice clon(?:e|ing)|zero[- ]shot tts|\btts\b)\b/i.test(source);
  const speechSynthesisCapability = /(text.to.speech|speech.synthesis|voice.clon|\btts\b)/.test(capabilitySource);
  return classificationCapability && speechSynthesisRepository && !speechSynthesisCapability;
}

function isAiPluginLike(item: GitHubSearchItem) {
  const text = `${item.name} ${item.description ?? ""} ${(item.topics ?? []).join(" ")}`.toLowerCase();
  const ai = /(artificial intelligence|\bai\b|llm|mcp|agent|copilot|claude|openai|gemini|rag|embedding)/i.test(text);
  const plugin = /(plugin|extension|skill|mcp|agent|tool|component|template|starter|integration|action)/i.test(text);
  return ai && plugin && !item.archived;
}

function toResource(
  item: GitHubSearchItem,
  projectTags: string[],
  overrides: {
    typeOverride?: ResourceType;
    tagOverrides?: string[];
    recommendationWeight?: number;
    riskOverride?: { level: RiskLevel; reason: string; license?: string };
    evidence?: RepositoryEvidence;
  } = {}
): Resource {
  const text = `${item.name} ${item.description ?? ""} ${(item.topics ?? []).join(" ")}`.toLowerCase();
  const displayName = item.full_name.toLowerCase() === "shadcn-ui/ui" ? "shadcn/ui" : item.name;
  const inferredType = inferDiscoveredType(text);
  const type = overrides.typeOverride ?? inferEvidenceType(inferredType, overrides.evidence);
  const effectiveLicense = overrides.riskOverride?.license ?? item.license?.spdx_id ?? null;
  const detectedRisk = assessRiskLevel({ stars: item.stargazers_count, license: effectiveLicense, latestCommitTime: item.pushed_at, archived: item.archived });
  const risk = overrides.riskOverride ?? detectedRisk;
  const matchedProjectTags = projectTags
    .map((tag) => tag.toLowerCase())
    .filter((tag) => matchesDiscoveryTerm(text, tag));
  const tags = Array.from(new Set([
    ...(overrides.tagOverrides ?? []),
    ...(item.topics ?? []),
    ...matchedProjectTags,
    type.replace("_", "-")
  ])).slice(0, 18);

  return {
    id: `github-${item.full_name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    slug: `github-${item.full_name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    name: displayName,
    type,
    description: item.description ?? `${displayName} GitHub repository`,
    tags,
    supported_agents: type === "mcp_server" ? ["Codex", "Claude", "Cursor"] : ["Codex"],
    install_command: type === "agent_skill"
      ? `npx skills add ${item.html_url}`
      : `Review and integrate from ${item.html_url}`,
    use_cases: [
      ...(overrides.evidence?.summary ? [overrides.evidence.summary] : []),
      "GitHub-discovered project resource",
      ...(item.language ? [`${item.language} project`] : [])
    ],
    risk_level: risk.level,
    risk_reason: risk.reason,
    trust_score: calculateTrust(item.stargazers_count, item.license?.spdx_id ?? null, risk.level),
    fit_score: Math.min(92, 55 + Math.min(25, Math.floor(Math.log10(Math.max(item.stargazers_count, 1)) * 8)) + (item.topics?.length ? 8 : 0)),
    ai_recommendation_weight: overrides.recommendationWeight,
    repo_url: item.html_url,
    github_stars: item.stargazers_count,
    github_forks: item.forks_count,
    license: effectiveLicense,
    latest_commit_at: item.pushed_at,
    readme_summary: item.description ?? `${displayName} GitHub repository`,
    has_skill_md: overrides.evidence?.hasSkillMd,
    has_mcp_manifest: overrides.evidence?.hasMcpManifest,
    has_package_json: overrides.evidence?.hasPackageJson,
    has_project_manifest: overrides.evidence?.hasProjectManifest,
    has_github_action: overrides.evidence?.hasGitHubAction,
    artifact_kind: overrides.evidence?.hasDatasetEvidence ? "dataset" : undefined,
    matched_capabilities: overrides.evidence?.matchedCapabilities,
    evidence_summary: overrides.evidence?.summary,
    source: "github_live",
    last_updated: (item.pushed_at ?? new Date().toISOString()).slice(0, 10)
  };
}

function inferDiscoveredType(text: string): ResourceType {
  const has = (pattern: RegExp) => pattern.test(text);
  if (has(/\b(mcp|model-context-protocol)\b/)) return "mcp_server";
  if (has(/\b(skill\.md|agent[- ]skills?|codex[- ]skills?|claude[- ]skills?|claude-code|skills?)\b/)) return "agent_skill";
  if (has(/\b(github action|github app|pull request)\b/)) return "github_plugin";
  if (has(/\b(ui|component|design system|shadcn|tailwind|frontend library|charting library|financial charts?|candlestick charts?|three\.?js|threejs|webgl|react-three-fiber|3d viewer|model viewer)\b/)) return "ui_component";
  return "template_repo";
}

function inferEvidenceType(fallback: ResourceType, evidence?: RepositoryEvidence): ResourceType {
  if (evidence?.hasSkillMd) return "agent_skill";
  if (evidence?.hasMcpManifest) return "mcp_server";
  if (evidence?.hasGitHubAction) return "github_plugin";
  if (evidence?.hasDatasetEvidence) return "github_plugin";
  if (evidence?.hasReusableUi) return "ui_component";
  return fallback;
}

function calculateTrust(stars: number, license: string | null, risk: string) {
  const starScore = Math.min(32, Math.floor(Math.log10(Math.max(stars, 1)) * 12));
  return Math.min(95, 35 + starScore + (license ? 16 : 0) + (risk === "low" ? 22 : risk === "medium" ? 12 : 4));
}

const genericDiscoveryTerms = new Set([
  "web", "web-app", "saas", "dashboard", "postgresql", "postgres", "nextjs", "next.js", "react", "nodejs",
  "typescript", "javascript", "frontend", "backend", "api", "docker", "vercel", "user-upload", "file-export"
]);

function getDiscoveryTerms(input: string, tags: string[]) {
  const tagTerms = tags
    .map((tag) => tag.toLowerCase().replace(/[^a-z0-9\s.-]/g, " ").replace(/\s+/g, " ").trim())
    .filter((tag) => tag.length > 1 && !genericDiscoveryTerms.has(tag));
  const inputTerms = input.match(/[a-z0-9][a-z0-9-]{1,}/gi)?.map((term) => term.toLowerCase()) ?? [];
  return Array.from(new Set([...tagTerms, ...inputTerms])).filter((term) => !genericDiscoveryTerms.has(term));
}

function quoteSearchTerm(term: string) {
  return /[\s-]/.test(term) ? `"${term}"` : term;
}

function scoreRepositoryRelevance(item: GitHubSearchItem, terms: string[], preferredNames = new Set<string>()) {
  const text = `${item.name} ${item.description ?? ""} ${(item.topics ?? []).join(" ")}`.toLowerCase();
  const directHits = terms.filter((term) => matchesDiscoveryTerm(text, term)).length;
  const tokenHits = terms.flatMap((term) => term.split(/[\s-]+/)).filter((term) => term.length > 1 && text.includes(term)).length;
  const popularity = Math.log10(Math.max(item.stargazers_count, 1)) * 4;
  const preferredBoost = preferredNames.has(item.full_name.toLowerCase()) ? 500 : 0;
  return directHits * 45 + tokenHits * 5 + popularity + preferredBoost;
}

function getDiscoveryProfile(input: string, tags: string[]) {
  const source = `${input} ${tags.join(" ")}`.toLowerCase();
  if (/(短视频|视频生成|文生视频|文本转视频|视频合成|ai.?视频|ai.?video|short.?video|text.to.video|video.generation)/i.test(source)) {
    return shortVideoDiscoveryProfile;
  }
  if (/(超市|货物|商品价格|库存|库位|货架|仓库|inventory.management|stock.control|warehouse.location)/i.test(source)) {
    return inventoryVoiceDiscoveryProfile;
  }
  if (/(炒股|股票|股市|证券行情|a股|stock.market|stock.trading|market.data|quantitative.trading)/i.test(source)) {
    return stockDiscoveryProfile;
  }
  if (/(2d.?转.?3d|二维.+三维|image.to.3d|single.image.3d|img2threejs)/i.test(source)) {
    return imageTo3dDiscoveryProfile;
  }
  if (/(植物病害|病虫害|叶片疾病|病斑|植物健康诊断|plant.disease|leaf.disease|crop.disease|plant.pathology)/i.test(source)) {
    return plantDiseaseDiscoveryProfile;
  }
  if (/(植物识别|识别植物|拍照识花|拍照识植物|花草识别|植物种类|plant.identification|plant.identifier|plant.species.recognition|species.classification)/i.test(source)) {
    return plantIdentificationDiscoveryProfile;
  }
  if (/(天气|天气预报|气象|weather.forecast|weather.api|historical.weather)/i.test(source)) {
    return weatherDiscoveryProfile;
  }
  if (/(饮食记录|饮食日志|热量记录|卡路里|营养记录|food.diary|meal.logging|nutrition.tracker|calorie.tracker)/i.test(source)) {
    return nutritionTrackingDiscoveryProfile;
  }
  if (/(健身记录|训练记录|运动记录|健身计划|训练计划|workout.tracker|fitness.tracker|activity.tracker|workout.planning)/i.test(source)) {
    return fitnessTrackingDiscoveryProfile;
  }
  if (/(美食|餐饮|做饭|菜谱|食谱|烹饪|饭菜|料理|吃什么|food.discovery|food.content|recipe|meal.planning|ingredient.recommendation|personalized.nutrition)/i.test(source)) {
    return recipeDiscoveryProfile;
  }
  if (/(配送|调度|车辆容量|时间窗|路线规划|路径优化|vehicle.routing|route.optimization|vrptw|fleet.routing)/i.test(source)) {
    return vehicleRoutingDiscoveryProfile;
  }
  return null;
}

function matchesDiscoveryTerm(text: string, term: string) {
  const normalizedText = text.replace(/[^a-z0-9]+/g, " ");
  const normalizedTerm = term.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return text.includes(term.toLowerCase()) || (normalizedTerm.length > 1 && normalizedText.includes(normalizedTerm));
}
