import { assessRiskLevel } from "./github-import";
import {
  isCapabilityEvidenceSufficient,
  isGenericCapabilityId,
  type CapabilityRequirement
} from "./capability-engine";
import { isResourceRecommendationEligible } from "./resource-verification";
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
  inspectionLimit?: number;
  searchQueryLimit?: number;
  signal?: AbortSignal;
};

type RepositoryEvidence = {
  hasSkillMd: boolean;
  hasMcpManifest: boolean;
  hasPackageJson: boolean;
  hasProjectManifest: boolean;
  hasGitHubAction: boolean;
  hasDatasetEvidence: boolean;
  hasReusableUi: boolean;
  hasReadmeUsage: boolean;
  hasStrongMetadataEvidence: boolean;
  isCollectionOnly: boolean;
  matchedCapabilities: string[];
  evidenceFiles: string[];
  summary: string;
};

type DiscoveryProfile = {
  queries: string[];
  relevanceTerms: string[];
};

export const DISCOVERY_CLASSIFIER_VERSION = "github-evidence-v15";

const shortVideoDiscoveryProfile: DiscoveryProfile = {
  queries: [
    "\"AI short video generator\" subtitles voiceover in:name,description,readme archived:false fork:false",
    "\"text to video\" FFmpeg MoviePy in:name,description,readme archived:false fork:false",
    "\"automated video creation\" TTS captions in:name,description,readme archived:false fork:false",
    "\"vertical video\" script footage subtitles in:name,description,readme archived:false fork:false"
  ],
  relevanceTerms: [
    "ai short video generator", "short video generation", "text-to-video", "script generation",
    "stock footage", "text-to-speech", "automatic subtitles", "video composition", "vertical video"
  ]
};

const inventoryVoiceDiscoveryProfile: DiscoveryProfile = {
  queries: [
    "\"inventory management\" \"stock location\" in:name,description,readme archived:false fork:false",
    "\"retail inventory\" \"item pricing\" in:name,description,readme archived:false fork:false",
    "\"Chinese ASR\" streaming speech-to-text in:name,description,readme archived:false fork:false",
    "\"speech recognition\" transcription in:name,description,readme archived:false fork:false"
  ],
  relevanceTerms: [
    "inventory management", "stock control", "warehouse location", "product catalog", "item pricing",
    "speech-to-text", "automatic speech recognition", "chinese asr", "streaming asr", "voice transcription"
  ]
};

const stockDiscoveryProfile: DiscoveryProfile = {
  queries: [
    "\"stock analysis\" \"market data\" in:name,description,readme archived:false fork:false",
    "\"A-share\" \"financial data\" in:name,description,readme archived:false fork:false",
    "\"quantitative trading\" backtesting in:name,description,readme archived:false fork:false",
    "\"financial charts\" library in:name,description,readme archived:false fork:false"
  ],
  relevanceTerms: [
    "stock analysis", "stock market", "market data", "financial data", "real-time quotes", "a-share",
    "technical analysis", "quantitative trading", "backtesting", "trading strategy", "financial charts"
  ]
};

const recipeDiscoveryProfile: DiscoveryProfile = {
  queries: [
    "\"recipe recommendation\" ingredients nutrition in:name,description,readme archived:false fork:false",
    "\"chinese recipes\" \"cooking steps\" in:name,description,readme archived:false fork:false",
    "\"recipe mcp\" server in:name,description,readme archived:false fork:false",
    "\"personalized nutrition\" age dietary in:name,description,readme archived:false fork:false"
  ],
  relevanceTerms: [
    "recipe recommendation", "chinese recipes", "ingredients", "cooking steps", "servings", "portion scaling",
    "dietary restrictions", "food allergies", "personalized nutrition", "age", "meal planning", "recipe mcp"
  ]
};

const plantIdentificationDiscoveryProfile: DiscoveryProfile = {
  queries: [
    "\"plant identification\" species image API in:name,description,readme archived:false fork:false",
    "\"plant species recognition\" image classification in:name,description,readme archived:false fork:false",
    "\"Pl@ntNet API\" plant identification in:name,description,readme archived:false fork:false"
  ],
  relevanceTerms: [
    "plant identification", "plant species recognition", "plant image classification",
    "species classification", "plantnet api", "ai taxonomist", "plant image dataset"
  ]
};

const plantDiseaseDiscoveryProfile: DiscoveryProfile = {
  queries: [
    "\"plant disease detection\" leaf image classification in:name,description,readme archived:false fork:false",
    "\"crop disease\" PlantVillage model in:name,description,readme archived:false fork:false"
  ],
  relevanceTerms: [
    "plant disease detection", "leaf disease classification", "crop disease recognition",
    "plant pathology", "plant disease dataset", "plantvillage"
  ]
};

const weatherDiscoveryProfile: DiscoveryProfile = {
  queries: [
    "\"weather API\" forecast historical in:name,description,readme archived:false fork:false",
    "\"weather forecast\" hourly daily API in:name,description,readme archived:false fork:false"
  ],
  relevanceTerms: [
    "weather api", "weather forecast", "current weather", "hourly forecast",
    "daily forecast", "historical weather", "climate data"
  ]
};

const nutritionTrackingDiscoveryProfile: DiscoveryProfile = {
  queries: [
    "\"food diary\" nutrition tracker barcode in:name,description,readme archived:false fork:false",
    "\"calorie tracker\" \"Open Food Facts\" in:name,description,readme archived:false fork:false"
  ],
  relevanceTerms: [
    "food diary", "meal logging", "nutrition tracker", "calorie tracker",
    "nutrition database", "barcode food lookup", "open food facts"
  ]
};

const fitnessTrackingDiscoveryProfile: DiscoveryProfile = {
  queries: [
    "\"workout tracker\" self-hosted in:name,description,readme archived:false fork:false",
    "\"fitness tracker\" workout planning body measurements in:name,description,readme archived:false fork:false"
  ],
  relevanceTerms: [
    "workout planning", "workout routines", "workout tracker", "fitness tracker",
    "activity tracker", "exercise log", "body measurements", "weight tracker"
  ]
};

const vehicleRoutingDiscoveryProfile: DiscoveryProfile = {
  queries: [
    "\"vehicle routing problem\" capacity \"time windows\" in:name,description,readme archived:false fork:false",
    "\"route optimization\" delivery fleet vrptw in:name,description,readme archived:false fork:false"
  ],
  relevanceTerms: [
    "vehicle routing problem", "vrp", "vrptw", "route optimization", "fleet routing",
    "vehicle capacity", "time windows", "pickup delivery", "delivery scheduling"
  ]
};

const imageTo3dDiscoveryProfile: DiscoveryProfile = {
  queries: [
    "\"image to 3d\" threejs in:name,description,readme archived:false fork:false",
    "\"single image\" \"3d model\" reconstruction in:name,description,readme archived:false fork:false"
  ],
  relevanceTerms: [
    "image to 3d", "single image 3d", "threejs", "depth estimation", "mesh generation",
    "3d reconstruction", "model viewer"
  ]
};

const libraryDiscoveryProfile: DiscoveryProfile = {
  queries: [
    "\"free software integrated library system\" in:name,description,readme archived:false fork:false",
    "\"library management system\" ISBN cataloging in:name,description,readme archived:false fork:false",
    "library circulation cataloging patron OPAC in:name,description,readme archived:false fork:false",
    "open source ILS patron management in:name,description,readme archived:false fork:false"
  ],
  relevanceTerms: [
    "integrated library system", "library circulation", "ISBN cataloging", "patron management",
    "bibliographic records", "library management system", "Koha", "ILS"
  ]
};

const meetingDiscoveryProfile: DiscoveryProfile = {
  queries: [
    "\"speaker diarization\" meeting transcription in:name,description,readme archived:false fork:false",
    "\"meeting transcription\" \"action items\" in:name,description,readme archived:false fork:false",
    "\"speaker diarization\" \"word timestamps\" in:name,description,readme archived:false fork:false",
    "\"meeting minutes\" transcription summarization in:name,description,readme archived:false fork:false"
  ],
  relevanceTerms: [
    "speaker diarization", "meeting transcription", "word timestamps", "meeting summary",
    "meeting minutes", "action items", "speaker labels"
  ]
};

const invoiceDiscoveryProfile: DiscoveryProfile = {
  queries: [
    "\"extract structured data\" invoices OCR in:name,description,readme archived:false fork:false",
    "\"invoice data extraction\" OCR in:name,description,readme archived:false fork:false",
    "\"receipt OCR\" \"structured data\" in:name,description,readme archived:false fork:false",
    "\"document OCR\" \"table recognition\" in:name,description,readme archived:false fork:false"
  ],
  relevanceTerms: [
    "invoice data extraction", "invoice OCR", "receipt OCR", "invoice parser",
    "line item extraction", "tax amount", "structured data", "table recognition"
  ]
};

const visualProductSearchDiscoveryProfile: DiscoveryProfile = {
  queries: [
    "\"visual product search\" \"search by image\" in:name,description,readme archived:false fork:false",
    "\"image text embeddings\" similarity search in:name,description,readme archived:false fork:false",
    "\"vector similarity search\" images in:name,description,readme archived:false fork:false",
    "\"product image retrieval\" embeddings in:name,description,readme archived:false fork:false"
  ],
  relevanceTerms: [
    "visual product search", "search by image", "product image retrieval", "image embeddings",
    "image text embeddings", "vector similarity search", "nearest neighbor search"
  ]
};

export async function discoverGitHubResources(
  input: string,
  tags: string[],
  existing: Resource[],
  context: DiscoveryContext = {}
): Promise<Resource[]> {
  const profile = getDiscoveryProfile(input, tags);
  const searchQueryLimit = Math.max(1, Math.min(context.searchQueryLimit ?? 4, 4));
  const queries = buildPlannedQueries(
    input,
    tags,
    context.searchQueries ?? [],
    context.capabilities ?? [],
    profile,
    searchQueryLimit
  );
  const initialResults = await mapWithConcurrency(
    queries,
    2,
    (query) => searchRepositories(query, 15, context.signal)
  );
  let results = initialResults;
  if (!context.signal?.aborted && results.flat().length < 12) {
    const fallbackQuery = buildFallbackQuery(input, tags);
    if (fallbackQuery && !queries.includes(fallbackQuery)) {
      try {
        results = [...results, await searchRepositories(fallbackQuery, 12, context.signal)];
      } catch {
        // Keep completed query results when the shared discovery deadline expires.
      }
    }
  }
  const existingUrls = new Set(existing.map((resource) => resource.repo_url).filter(Boolean));
  const unique = new Map<string, GitHubSearchItem>();

  results.flat().forEach((item) => {
    if (!existingUrls.has(item.html_url)) {
      unique.set(item.full_name.toLowerCase(), item);
    }
  });

  const relevanceTerms = Array.from(new Set([
    ...getDiscoveryTerms(input, tags),
    ...(profile?.relevanceTerms ?? []),
    ...(context.searchQueries ?? []),
    ...(context.capabilities ?? []).flatMap((capability) => capability.keywords)
  ]));
  const ranked = Array.from(unique.values())
    .sort((left, right) =>
      scoreRepositoryRelevance(right, relevanceTerms) -
      scoreRepositoryRelevance(left, relevanceTerms)
    )
    .slice(0, 24);
  const queryLeaders = roundRobin(
    initialResults.map((items) => items.slice(0, 3))
  );
  const candidates = Array.from(new Map(
    [...queryLeaders, ...ranked].map((item) => [item.full_name.toLowerCase(), item])
  ).values()).slice(0, 24);
  const defaultInspectionLimit = profile ? 10 : 12;
  const inspectionLimit = Math.max(
    1,
    Math.min(context.inspectionLimit ?? defaultInspectionLimit, defaultInspectionLimit)
  );
  const evidenceEntries = await mapWithConcurrency(
    candidates.slice(0, inspectionLimit),
    4,
    async (item) => [
      item.full_name.toLowerCase(),
      await inspectRepository(item, context.capabilities ?? [], context.signal)
    ] as const
  );
  const evidenceByRepository = new Map(evidenceEntries);

  const evidencedCandidates = candidates
    .filter((item) => {
      const evidence = evidenceByRepository.get(item.full_name.toLowerCase());
      return evidence ? hasColdStartEvidence(evidence) : false;
    });

  return dedupeRepositoriesByProjectName(evidencedCandidates)
    .map((item) => {
      const key = item.full_name.toLowerCase();
      return toResource(item, tags, {
        evidence: evidenceByRepository.get(key)
      });
    })
    .filter(isResourceRecommendationEligible);
}

function dedupeRepositoriesByProjectName(items: GitHubSearchItem[]) {
  const bestByName = new Map<string, GitHubSearchItem>();
  items.forEach((item) => {
    const key = item.name.toLowerCase().replace(/[^a-z0-9]+/g, "");
    const current = bestByName.get(key);
    if (!current || item.stargazers_count > current.stargazers_count) bestByName.set(key, item);
  });
  return Array.from(bestByName.values());
}

export async function verifyGitHubRepository(
  fullName: string,
  projectTags: string[],
  capabilities: CapabilityRequirement[]
): Promise<Resource | null> {
  const item = await fetchRepository(fullName);
  if (!item) return null;
  const evidence = await inspectRepository(item, capabilities);
  if (!hasColdStartEvidence(evidence)) return null;
  return toResource(item, projectTags, {
    evidence
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
  profile: DiscoveryProfile | null,
  queryLimit: number
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
  const profileQueries = profile?.queries.slice(0, queryLimit) ?? [];
  const adaptiveQueries = profile ? [] : buildColdStartQueries(capabilities);
  const focusedAdaptiveQueries = adaptiveQueries.map((query, index) =>
    index === 0 ? scopeQueryToRepositoryMetadata(query) : query
  );
  const fallbackQueries = buildQueries(input, tags);
  if (profile) {
    return Array.from(new Set([
      ...profileQueries,
      ...planned.slice(0, 1),
      ...relaxedPlanned.slice(0, 1),
      ...fallbackQueries
    ])).slice(0, queryLimit);
  }
  return Array.from(new Set([
    ...interleaveQueries(focusedAdaptiveQueries, planned),
    ...relaxedPlanned.slice(0, 1),
    ...fallbackQueries
  ])).slice(0, queryLimit);
}

function interleaveQueries(primary: string[], secondary: string[]) {
  return roundRobin([primary, secondary]);
}

function scopeQueryToRepositoryMetadata(query: string) {
  return query.replace("in:name,description,readme", "in:name,description");
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
) {
  const results: R[] = [];
  let nextIndex = 0;
  const workers = Array.from(
    { length: Math.min(Math.max(1, concurrency), items.length) },
    async () => {
      while (nextIndex < items.length) {
        const index = nextIndex;
        nextIndex += 1;
        try {
          results[index] = await mapper(items[index]);
        } catch {
          // Individual GitHub failures must not discard completed evidence.
        }
      }
    }
  );
  await Promise.all(workers);
  return results.filter((result): result is R => result !== undefined);
}

function roundRobin<T>(groups: T[][]) {
  const results: T[] = [];
  const maxLength = Math.max(0, ...groups.map((group) => group.length));
  for (let index = 0; index < maxLength; index += 1) {
    groups.forEach((group) => {
      if (group[index] !== undefined) results.push(group[index]);
    });
  }
  return results;
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
        .slice(0, 3);
      const orderedKeywords = keywords.length === 3
        ? [keywords[0], keywords[2], keywords[1]]
        : keywords;
      return { priority: capability.priority, keywords: orderedKeywords };
    })
    .filter((entry) => entry.keywords.length > 0);
  const coreTerms = roundRobin(
    ranked
      .filter((entry) => entry.priority === "core")
      .map((entry) => entry.keywords)
  );
  const requiredTerms = roundRobin(
    ranked
      .filter((entry) => entry.priority === "required")
      .map((entry) => entry.keywords)
  );
  const optionalTerms = ranked
    .filter((entry) => entry.priority === "optional")
    .flatMap((entry) => entry.keywords.slice(0, 1));
  const terms = [
    ...coreTerms.slice(0, 2),
    ...requiredTerms,
    ...coreTerms.slice(2),
    ...optionalTerms,
    ...coreTerms.map(buildRelaxedSearchTerm)
  ];
  return Array.from(new Set(terms))
    .filter(Boolean)
    .slice(0, 6)
    .map((query) => `${quoteSearchTerm(query)} in:name,description,readme archived:false fork:false`);
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

async function searchRepositories(
  query: string,
  perPage = 15,
  signal?: AbortSignal
): Promise<GitHubSearchItem[]> {
  const headers: HeadersInit = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  try {
    const response = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${perPage}`, {
      headers,
      cache: "no-store",
      signal: requestSignal(signal, 8000)
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

async function fetchRepository(
  fullName: string,
  signal?: AbortSignal
): Promise<GitHubSearchItem | null> {
  const headers: HeadersInit = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const repositoryPath = fullName.split("/").map(encodeURIComponent).join("/");
  try {
    const response = await fetch(`https://api.github.com/repos/${repositoryPath}`, {
      headers,
      cache: "no-store",
      signal: requestSignal(signal, 8000)
    });
    if (!response.ok) return null;
    return await response.json() as GitHubSearchItem;
  } catch {
    return null;
  }
}

const repositoryInspectionCache = new Map<string, {
  expiresAt: number;
  value: Promise<{ paths: string[]; readme: string }>;
}>();

async function inspectRepository(
  item: GitHubSearchItem,
  capabilities: CapabilityRequirement[],
  signal?: AbortSignal
): Promise<RepositoryEvidence> {
  const inspection = await getRepositoryInspection(item, signal);
  const normalizedPaths = inspection.paths.map((path) => path.toLowerCase());
  const hasSkillMd = normalizedPaths.some((path) => /(^|\/)skill\.md$/.test(path));
  const hasPackageJson = normalizedPaths.some((path) => /(^|\/)package\.json$/.test(path));
  const hasProjectManifest = normalizedPaths.some((path) =>
    /(^|\/)(package\.json|pyproject\.toml|requirements\.txt|cargo\.toml|go\.mod|pom\.xml|composer\.json|build\.gradle(?:\.kts)?|settings\.gradle(?:\.kts)?|gradlew|pubspec\.yaml|podfile|project\.pbxproj)$/.test(path)
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
  const capabilityReadme = stripNonImplementedReadmeSections(inspection.readme);
  const metadataEvidenceSource = [
    item.name,
    item.description ?? "",
    ...(item.topics ?? [])
  ].join(" ").toLowerCase();
  const primaryEvidenceSource = [
    item.name,
    item.description ?? "",
    ...(item.topics ?? []),
    capabilityReadme.slice(0, 2500)
  ].join(" ").toLowerCase();
  const evidenceSource = [
    item.name,
    item.description ?? "",
    ...(item.topics ?? []),
    ...inspection.paths.slice(0, 500),
    capabilityReadme.slice(0, 24000)
  ].join(" ").toLowerCase();
  const hasDatasetEvidence = /\b(dataset|training data|benchmark dataset|annotated images?|annotations?)\b/i.test(evidenceSource)
    && normalizedPaths.some((path) =>
      /(^|\/)(data|dataset|datasets|annotations?)(\/|$)/.test(path)
      || /\.(csv|jsonl|parquet|tfrecord|arrow)$/.test(path)
    );
  const hasReusableUi = hasPackageJson
    && /\b(component library|web[- ]?component|ui library|design system|react components?|vue components?|svelte components?)\b/i.test(evidenceSource);
  const hasReadmeUsage = inspection.readme.length >= 300
    && /\b(installation|installing|getting started|quick start|quickstart|usage|docker compose|npm install|pip install|developer handbook)\b/i.test(inspection.readme);
  const collectionSource = `${item.name} ${item.description ?? ""} ${inspection.readme.slice(0, 1200)}`;
  const isCollectionOnly = /(?:^|[\s_-])awesome(?:[\s_-]|$)|curated list|collection of (?:free |open source )?(?:resources|projects|tools|apis|servers)|list of (?:free |open source )?(?:resources|projects|tools|apis|servers)/i.test(collectionSource);
  const matched = capabilities.filter((capability) =>
    capability.keywords.some((keyword) => matchesCapabilityKeyword(primaryEvidenceSource, keyword))
    && !capability.negativeKeywords.some((keyword) => matchesEvidenceTerm(primaryEvidenceSource, keyword))
    && !hasCapabilityConflict(primaryEvidenceSource, capability)
    && isCapabilityEvidenceSufficient(capability.id, primaryEvidenceSource)
  );
  const metadataMatched = capabilities.filter((capability) =>
    capability.keywords.some((keyword) => matchesCapabilityKeyword(metadataEvidenceSource, keyword))
    && !capability.negativeKeywords.some((keyword) => matchesEvidenceTerm(metadataEvidenceSource, keyword))
    && !hasCapabilityConflict(metadataEvidenceSource, capability)
    && isCapabilityEvidenceSufficient(capability.id, metadataEvidenceSource)
  );
  const hasStrongMetadataEvidence = Boolean(item.description)
    && item.stargazers_count >= 50
    && Boolean(item.license?.spdx_id)
    && metadataMatched.length > 0;
  const evidenceFiles = inspection.paths.filter((path) =>
    /(^|\/)(skill\.md|package\.json|pyproject\.toml|requirements\.txt|cargo\.toml|go\.mod|pom\.xml|composer\.json|build\.gradle(?:\.kts)?|settings\.gradle(?:\.kts)?|gradlew|pubspec\.yaml|podfile|project\.pbxproj|action\.ya?ml|mcp\.json|\.mcp\.json|readme\.md)$/i.test(path)
  ).slice(0, 8);
  const signals = [
    hasSkillMd ? "检测到 SKILL.md" : "",
    hasMcpManifest ? "检测到 MCP Server 或配置清单" : "",
    hasPackageJson ? "检测到 package.json" : "",
    hasProjectManifest && !hasPackageJson ? "检测到项目清单" : "",
    hasGitHubAction ? "检测到 GitHub Action" : "",
    hasDatasetEvidence ? "检测到数据集说明和数据文件" : "",
    hasReusableUi ? "检测到可复用 UI 组件" : "",
    hasReadmeUsage ? "README 包含安装或使用说明" : "",
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
    hasReadmeUsage,
    hasStrongMetadataEvidence,
    isCollectionOnly,
    matchedCapabilities: matched.map((capability) => capability.id),
    evidenceFiles,
    summary: signals.length > 0 ? `仓库证据：${signals.join("；")}。` : "仓库证据：未检测到明确的 Skill、MCP 或核心能力文件信号。"
  };
}

function stripNonImplementedReadmeSections(readme: string) {
  const excludedHeading = /\b(?:community integrations?|related projects?|similar projects?|alternatives?|roadmap|planned features?|coming soon|acknowledg(?:e)?ments?|references?|further reading)\b/i;
  let excludedLevel = 0;
  return readme
    .split(/\r?\n/)
    .filter((line) => {
      const heading = /^(#{1,6})\s+(.+)$/.exec(line.trim());
      if (heading) {
        const level = heading[1].length;
        if (excludedLevel > 0 && level <= excludedLevel) excludedLevel = 0;
        if (excludedHeading.test(heading[2])) excludedLevel = level;
      }
      return excludedLevel === 0;
    })
    .join("\n");
}

function hasColdStartEvidence(evidence: RepositoryEvidence) {
  if (evidence.isCollectionOnly) return false;
  if (!evidence.matchedCapabilities.some((id) => !isGenericCapabilityId(id))) return false;
  return evidence.hasSkillMd
    || evidence.hasMcpManifest
    || evidence.hasPackageJson
    || evidence.hasProjectManifest
    || evidence.hasGitHubAction
    || evidence.hasDatasetEvidence
    || evidence.hasReusableUi
    || evidence.hasReadmeUsage
    || evidence.hasStrongMetadataEvidence;
}

async function getRepositoryInspection(item: GitHubSearchItem, signal?: AbortSignal) {
  if (signal) {
    const [paths, readme] = await Promise.all([
      fetchRepositoryTree(item.full_name, item.default_branch ?? "main", signal),
      fetchRepositoryReadme(item.full_name, signal)
    ]);
    return { paths, readme };
  }

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

async function fetchRepositoryTree(
  fullName: string,
  branch: string,
  signal?: AbortSignal
) {
  const headers: HeadersInit = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const repositoryPath = fullName.split("/").map(encodeURIComponent).join("/");
  try {
    const response = await fetch(
      `https://api.github.com/repos/${repositoryPath}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
      { headers, cache: "no-store", signal: requestSignal(signal, 1500) }
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

async function fetchRepositoryReadme(fullName: string, signal?: AbortSignal) {
  const headers: HeadersInit = { Accept: "application/vnd.github.raw+json", "X-GitHub-Api-Version": "2022-11-28" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const repositoryPath = fullName.split("/").map(encodeURIComponent).join("/");
  try {
    const response = await fetch(`https://api.github.com/repos/${repositoryPath}/readme`, {
      headers,
      cache: "no-store",
      signal: requestSignal(signal, 3000)
    });
    if (!response.ok) return "";
    return (await response.text()).slice(0, 40000);
  } catch {
    return "";
  }
}

function requestSignal(signal: AbortSignal | undefined, timeoutMs: number) {
  const timeout = AbortSignal.timeout(timeoutMs);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
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
  "recognition", "service", "software", "source", "system", "tool"
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
    has_repository_metadata_evidence: overrides.evidence?.hasStrongMetadataEvidence,
    has_github_action: overrides.evidence?.hasGitHubAction,
    artifact_kind: overrides.evidence?.hasDatasetEvidence ? "dataset" : undefined,
    matched_capabilities: overrides.evidence?.matchedCapabilities,
    evidence_summary: overrides.evidence?.summary,
    discovery_classifier_version: DISCOVERY_CLASSIFIER_VERSION,
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

function scoreRepositoryRelevance(item: GitHubSearchItem, terms: string[]) {
  const text = `${item.name} ${item.description ?? ""} ${(item.topics ?? []).join(" ")}`.toLowerCase();
  const directHits = terms.filter((term) => matchesDiscoveryTerm(text, term)).length;
  const tokenHits = terms.flatMap((term) => term.split(/[\s-]+/)).filter((term) => term.length > 1 && text.includes(term)).length;
  const popularity = Math.log10(Math.max(item.stargazers_count, 1)) * 4;
  return directHits * 45 + tokenHits * 5 + popularity;
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
  if (/(图书馆|图书管理|编目|借还|借阅|读者管理|isbn|library.circulation|integrated.library.system|patron.management)/i.test(source)) {
    return libraryDiscoveryProfile;
  }
  if (/(会议录音|会议转写|说话人|会议摘要|会议纪要|行动项|speaker.diarization|meeting.transcription|meeting.summarization)/i.test(source)) {
    return meetingDiscoveryProfile;
  }
  if (/(发票|收据|票据|费用审核|invoice.ocr|invoice.extraction|receipt.ocr)/i.test(source)) {
    return invoiceDiscoveryProfile;
  }
  if (/(以图搜图|商品图片|相似商品|视觉搜索|visual.product.search|product.image.retrieval|image.similarity.search)/i.test(source)) {
    return visualProductSearchDiscoveryProfile;
  }
  if (/(植物病害|病害识别|作物病害|叶片病害|病虫害|叶片疾病|病斑|植物健康诊断|plant.disease|leaf.disease|crop.disease|plant.pathology)/i.test(source)) {
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
  if (
    /(配送|车辆容量|车队调度|物流调度|配送调度|vehicle.routing|route.optimization|vrptw|fleet.routing)/i.test(source)
    || /(?:物流|车辆|车队|配送).{0,12}(?:路线规划|路径优化|调度|时间窗)/i.test(source)
  ) {
    return vehicleRoutingDiscoveryProfile;
  }
  return null;
}

function matchesDiscoveryTerm(text: string, term: string) {
  const normalizedText = text.replace(/[^a-z0-9]+/g, " ");
  const normalizedTerm = term.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return text.includes(term.toLowerCase()) || (normalizedTerm.length > 1 && normalizedText.includes(normalizedTerm));
}
