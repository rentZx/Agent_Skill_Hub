import assert from "node:assert/strict";
import dotenv from "dotenv";
import type { CapabilityRequirement } from "../lib/capability-engine";
import { discoverGitHubResources } from "../lib/github-discovery-core";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

type NovelCase = {
  name: string;
  prompt: string;
  tags: string[];
  capabilities: CapabilityRequirement[];
  references: string[];
  forbiddenClaims?: Record<string, string[]>;
};

const cases: NovelCase[] = [
  {
    name: "library-circulation",
    prompt: "\u5f00\u53d1\u56fe\u4e66\u9986\u7ba1\u7406\u7cfb\u7edf\uff0c\u652f\u6301 ISBN \u7f16\u76ee\u3001\u56fe\u4e66\u501f\u8fd8\u3001\u8bfb\u8005\u7ba1\u7406\u3001\u6761\u7801\u548c RFID \u76d8\u70b9",
    tags: ["library", "circulation", "isbn", "cataloging"],
    capabilities: [capability("library-circulation", "Library circulation", [
      "integrated library system", "library circulation", "isbn cataloging", "patron management"
    ])],
    references: [
      "koha-community/koha", "rero/rero-ils", "fabiodalez-dev/pinakes",
      "digitalplatform/dp2", "slims/slims9_bulian"
    ]
  },
  {
    name: "meeting-transcription",
    prompt: "\u5f00\u53d1\u4f1a\u8bae\u5f55\u97f3\u8f6c\u5199\u5de5\u5177\uff0c\u533a\u5206\u4e0d\u540c\u8bf4\u8bdd\u4eba\uff0c\u81ea\u52a8\u751f\u6210\u4f1a\u8bae\u6458\u8981\u548c\u884c\u52a8\u9879",
    tags: ["meeting", "transcription", "speaker-diarization"],
    capabilities: [
      capability("speech-to-text", "Speech to text", ["speech to text", "meeting transcription", "audio transcription"], "required"),
      capability("speaker-diarization", "Speaker diarization", ["speaker diarization", "meeting transcription", "speaker labels"]),
      capability("meeting-summarization", "Meeting summarization", ["meeting summary", "meeting minutes", "action items"], "required")
    ],
    references: [
      "m-bain/whisperx", "pyannote/pyannote-audio", "systran/faster-whisper",
      "zackriya-solutions/meetily", "screenpipe/screenpipe", "modelscope/funasr",
      "pretyflaco/meetscribe", "pretyflaco/millet", "vexa-ai/vexa", "moonshine-ai/moonshine",
      "quentinfuxa/whisperlivekit"
    ],
    forbiddenClaims: {
      "systran/faster-whisper": ["speaker-diarization", "meeting-summarization"],
      "zackriya-solutions/meetily": ["speaker-diarization"]
    }
  },
  {
    name: "invoice-ocr",
    prompt: "\u5f00\u53d1\u53d1\u7968\u548c\u6536\u636e OCR \u8d39\u7528\u5ba1\u6838\u7cfb\u7edf\uff0c\u62bd\u53d6\u4f9b\u5e94\u5546\u3001\u7a0e\u989d\u3001\u91d1\u989d\u548c\u660e\u7ec6",
    tags: ["invoice", "receipt", "ocr", "document-extraction"],
    capabilities: [
      capability("invoice-ocr", "Invoice OCR", ["invoice data extraction", "invoice ocr", "receipt ocr", "invoice line item extraction"]),
      capability("document-ocr-engine", "Document OCR", ["document ocr", "table recognition", "structured document extraction"], "required")
    ],
    references: [
      "invoice-x/invoice2data", "paddlepaddle/paddleocr", "jingsongliujing/onnxocr",
      "datalab-to/surya", "layout-parser/layout-parser", "bhimrazy/receipt-ocr",
      "getomni-ai/zerox", "akshayg999/mistralocr---ai-powered-document-extraction",
      "knotsberryofficial-hash/n8n-node-billflux-invoice-receipt-ocr"
    ]
  },
  {
    name: "visual-product-search",
    prompt: "\u5f00\u53d1\u7535\u5546\u4ee5\u56fe\u641c\u56fe\u7cfb\u7edf\uff0c\u4e0a\u4f20\u5546\u54c1\u56fe\u7247\u540e\u68c0\u7d22\u89c6\u89c9\u76f8\u4f3c\u5546\u54c1",
    tags: ["visual-search", "image-embeddings", "vector-search", "ecommerce"],
    capabilities: [
      capability("visual-product-search", "Visual product search", ["visual product search", "product image retrieval", "search by image"]),
      capability("multimodal-image-embeddings", "Image embeddings", ["image text embeddings", "openai clip", "multimodal embeddings"], "required"),
      capability("vector-similarity-index", "Vector similarity", ["vector similarity search", "vector database", "nearest neighbor search"], "required")
    ],
    references: [
      "openai/clip", "qdrant/qdrant", "milvus-io/milvus", "weaviate/weaviate",
      "neuml/txtai", "yerdaulet-damir/langgraph-sales-agent", "redis/redis",
      "unum-cloud/usearch", "soupfix/visual_product_search_engine", "michaelfeil/infinity"
    ],
    forbiddenClaims: {
      "unum-cloud/usearch": ["multimodal-image-embeddings"],
      "michaelfeil/infinity": ["vector-similarity-index"]
    }
  },
  {
    name: "hiking-route-planner",
    prompt: "\u5f00\u53d1\u6237\u5916\u5f92\u6b65\u8def\u7ebf\u89c4\u5212\u5de5\u5177\uff0c\u652f\u6301\u5730\u56fe\u663e\u793a\u3001\u6d77\u62d4\u3001\u79bb\u7ebf\u5730\u56fe\u548c GPX \u5bfc\u5165\u5bfc\u51fa",
    tags: ["hiking", "routing", "maps", "gpx"],
    capabilities: [
      capability("pedestrian-routing", "Pedestrian routing", ["pedestrian routing", "hiking route planning", "open source routing engine"]),
      capability("interactive-map", "Interactive map", ["interactive map library", "offline maps", "vector map rendering"], "required"),
      capability("gpx-processing", "GPX processing", ["gpx import export", "gpx parser", "gpx track editor"], "required")
    ],
    references: [
      "graphhopper/graphhopper", "valhalla/valhalla", "giscience/openrouteservice",
      "maplibre/maplibre-gl-js", "leaflet/leaflet", "gpxstudio/gpxstudio.github.io",
      "kothic/kothic-js", "auvroislam/nongor", "quinnarnold/safewalk"
    ]
  },
  {
    name: "home-energy-monitoring",
    prompt: "\u5f00\u53d1\u5bb6\u5ead\u7528\u7535\u76d1\u6d4b\u7cfb\u7edf\uff0c\u8bfb\u53d6\u667a\u80fd\u7535\u8868\u548c MQTT \u4f20\u611f\u5668\uff0c\u5c55\u793a\u5b9e\u65f6\u529f\u7387\u3001\u5386\u53f2\u7528\u7535\u548c\u8d39\u7528\u7edf\u8ba1",
    tags: ["energy-monitoring", "smart-meter", "mqtt", "home-automation"],
    capabilities: [
      capability("home-energy-monitoring", "Home energy monitoring", ["home energy monitoring", "electricity consumption dashboard", "smart meter monitoring"]),
      capability("mqtt-sensor-ingestion", "MQTT sensor ingestion", ["mqtt energy sensor", "mqtt smart meter", "real time power monitoring"], "required")
    ],
    references: [
      "emoncms/emoncms", "openenergymonitor/emonpi", "home-assistant/core",
      "home-assistant/frontend", "openenergymonitor/emonhub", "intelwolf/p1monitor",
      "cbpowell/senselink", "will-iamalpine/energymeter", "danpeig/esp32energymonitor",
      "anmirazik/home-energy-monitoring", "slygriyrsk/ecotrack"
    ]
  },
  {
    name: "medical-image-segmentation",
    prompt: "\u5f00\u53d1\u533b\u5b66\u5f71\u50cf\u8f85\u52a9\u6807\u6ce8\u5de5\u5177\uff0c\u652f\u6301 DICOM \u6d4f\u89c8\u3001CT/MRI \u5206\u5272\u3001\u4eba\u5de5\u4fee\u6b63\u548c\u5bfc\u51fa",
    tags: ["medical-imaging", "dicom", "segmentation", "annotation"],
    capabilities: [
      capability("medical-image-segmentation", "Medical image segmentation", ["medical image segmentation", "ct mri segmentation", "interactive segmentation"]),
      capability("dicom-viewer", "DICOM viewer", ["dicom viewer", "medical imaging viewer", "dicom web viewer"], "required"),
      capability("medical-image-labeling", "Medical image labeling", ["medical image annotation", "ai assisted labeling", "segmentation annotation"], "required")
    ],
    references: [
      "project-monai/monai", "project-monai/monailabel", "ohif/viewers",
      "mic-dkfz/nnunet", "project-monai/monai-deploy-app-sdk", "nroduit/weasis",
      "junma11/seglossodyssey", "beckschen/transunet", "hilab-git/ssl4mis"
    ],
    forbiddenClaims: {
      "idea-research/grounded-segment-anything": ["medical-image-segmentation", "medical-image-labeling"],
      "nroduit/weasis": ["medical-image-segmentation", "medical-image-labeling"]
    }
  },
  {
    name: "video-surveillance-tracking",
    prompt: "\u5f00\u53d1\u672c\u5730\u89c6\u9891\u76d1\u63a7\u7cfb\u7edf\uff0c\u63a5\u5165 RTSP \u6444\u50cf\u5934\uff0c\u8bc6\u522b\u4eba\u548c\u8f66\u8f86\u3001\u6301\u7eed\u8ddf\u8e2a\u5e76\u89e6\u53d1\u544a\u8b66",
    tags: ["video-surveillance", "rtsp", "object-detection", "object-tracking"],
    capabilities: [
      capability("video-nvr-detection", "Video NVR detection", ["object detection nvr", "rtsp object detection", "local video surveillance"]),
      capability("multi-object-tracking", "Multi object tracking", ["multi object tracking", "real time object tracking", "person vehicle tracking"], "required")
    ],
    references: [
      "blakeblackshear/frigate", "ultralytics/ultralytics", "ifzhang/bytetrack",
      "nwojke/deep_sort", "open-mmlab/mmdetection", "himayal/vidguard_ai-smart-video-surveillance",
      "roboflow/supervision", "badbread/crumbvms", "paddlepaddle/paddledetection",
      "foundationvision/bytetrack", "mikel-brostrom/boxmot"
    ]
  },
  {
    name: "point-cloud-annotation",
    prompt: "开发自动驾驶点云标注平台，支持激光雷达点云三维框、语义分割和 KITTI 导出",
    tags: ["point-cloud", "lidar", "3d-annotation", "kitti"],
    capabilities: [
      capability("3d-bbox-annotation", "3D bounding box annotation", ["point cloud annotation", "3d bounding box point cloud"]),
      capability("point-cloud-semantic-segmentation", "Point cloud semantic segmentation", ["point cloud semantic segmentation", "point cloud labeling"], "required"),
      capability("kitti-export", "KITTI export", ["kitti annotation export", "kitti label format"], "required")
    ],
    references: [
      "naurril/sustechpoints", "ch-sa/labelcloud", "walzimmer/3d-bat",
      "walzimmer/bat-3d", "yzrobot/cloud_annotation_tool", "alvinwan/antsy3d"
    ]
  },
  {
    name: "indoor-navigation",
    prompt: "开发商场室内导航应用，使用 BLE 信标定位，支持楼层地图、室内路径规划和无障碍路线",
    tags: ["indoor-navigation", "ble-beacon", "wayfinding", "floor-map"],
    capabilities: [
      capability("ble-indoor-positioning", "BLE indoor positioning", ["indoor navigation ble beacon", "indoor positioning ibeacon"]),
      capability("indoor-path-routing", "Indoor path routing", ["indoor wayfinding", "indoor routing floor plan"]),
      capability("accessible-indoor-route", "Accessible indoor routing", ["accessible indoor route", "wheelchair indoor navigation"], "required")
    ],
    references: [
      "dmsl/anyplace", "mingjunsiek/ble_pathfinder", "f1rede/beacon-navigator",
      "rootcircle/beaconify", "knotzerio/indoor-wayfinder", "indrz/indrz-fe"
    ],
    forbiddenClaims: {
      "knotzerio/indoor-wayfinder": ["ble-indoor-positioning"],
      "dungnotnull/accessible-shopping-visually-impaired-agent-skill": ["indoor-path-routing"]
    }
  }
];

async function main() {
  const reports = [];
  let selected = 0;
  let knownReferenceMatches = 0;
  let coveredCases = 0;
  const claimViolations: Array<{ repository: string; capability: string }> = [];

  for (const testCase of cases) {
    const resources = await discoverGitHubResources(testCase.prompt, testCase.tags, [], {
      capabilities: testCase.capabilities,
      searchQueries: [],
      inspectionLimit: 10,
      searchQueryLimit: 2
    });
    const references = new Set(testCase.references);
    const names = resources.map((resource) => repositoryKey(resource.repo_url));
    const matches = names.filter((name) => references.has(name));
    selected += names.length;
    knownReferenceMatches += matches.length;
    if (matches.length > 0) coveredCases += 1;
    resources.forEach((resource) => {
      const repository = repositoryKey(resource.repo_url);
      const forbidden = new Set(testCase.forbiddenClaims?.[repository] ?? []);
      (resource.matched_capabilities ?? []).forEach((capabilityId) => {
        if (forbidden.has(capabilityId)) claimViolations.push({ repository, capability: capabilityId });
      });
    });
    reports.push({
      name: testCase.name,
      selected: names,
      knownReferenceMatches: matches,
      additionalEvidenceCandidates: names.filter((name) => !references.has(name)),
      matchedCapabilities: resources.map((resource) => ({
        repository: repositoryKey(resource.repo_url),
        capabilities: resource.matched_capabilities ?? []
      }))
    });
  }

  const knownReferenceShare = selected === 0 ? 0 : knownReferenceMatches / selected;
  const scenarioCoverage = coveredCases / cases.length;
  console.log(JSON.stringify({
    selected,
    knownReferenceMatches,
    knownReferenceShare: round(knownReferenceShare),
    scenarioCoverage: round(scenarioCoverage),
    claimViolations,
    reports
  }));

  assert(scenarioCoverage >= 0.85, `Novel-domain scenario coverage ${round(scenarioCoverage)} is below 0.85.`);
  assert.equal(claimViolations.length, 0, `Unsupported capability claims: ${JSON.stringify(claimViolations)}`);
}

function capability(
  id: string,
  label: string,
  keywords: string[],
  priority: CapabilityRequirement["priority"] = "core"
): CapabilityRequirement {
  return {
    id,
    label,
    description: label,
    required: true,
    priority,
    resourceRoles: ["domain_system", "domain_algorithm"],
    keywords,
    negativeKeywords: [],
    preferredTypes: ["github_plugin", "template_repo", "agent_skill"]
  };
}

function repositoryKey(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.pathname.replace(/^\/+|\/+$/g, "").replace(/\.git$/i, "").toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
