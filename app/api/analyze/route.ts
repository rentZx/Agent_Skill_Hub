import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { analyzeProjectWithAI } from "@/lib/analyzer-service";
import { parseLlmRuntimeConfig } from "@/lib/llm-config";
import {
  getPublicLlmErrorMessage,
  LlmProviderRequestError
} from "@/lib/llm";
import { getResources } from "@/lib/resources";
import {
  enforceRateLimit,
  noStoreJson,
  readJsonBody,
  RequestValidationError
} from "@/lib/server-security";

const analyzeRateLimit = positiveInteger(process.env.ANALYZE_RATE_LIMIT, 12);
const analyzeRateWindowMs = positiveInteger(process.env.ANALYZE_RATE_WINDOW_MS, 5 * 60 * 1000);
const maxConcurrentAnalyses = positiveInteger(process.env.ANALYZE_MAX_CONCURRENCY, 4);
let activeAnalyses = 0;

export async function POST(request: Request) {
  const startedAt = performance.now();
  const rateLimited = enforceRateLimit(request, "analyze", analyzeRateLimit, analyzeRateWindowMs);
  if (rateLimited) return rateLimited;

  if (!isSecureKeyTransport(request)) {
    return noStoreJson(
      {
        ok: false,
        error: "项目分析需要通过 HTTPS 安全传输 API Key。当前仍可使用资源搜索。",
        code: "HTTPS_REQUIRED"
      },
      { status: 426 }
    );
  }

  if (activeAnalyses >= maxConcurrentAnalyses) {
    return NextResponse.json(
      { ok: false, error: "分析服务当前繁忙，请稍后重试。" },
      { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "10" } }
    );
  }

  const requestId = randomUUID();
  activeAnalyses += 1;

  try {
    const body = await readJsonBody<{ input?: unknown; llm?: unknown }>(request, 12 * 1024);
    if (typeof body.input !== "string") {
      return noStoreJson({ ok: false, error: "请输入项目描述。" }, { status: 400 });
    }

    const input = body.input?.trim();
    if (!input) return noStoreJson({ ok: false, error: "请输入项目描述。" }, { status: 400 });
    if (input.length > 2000) {
      return noStoreJson({ ok: false, error: "项目描述不能超过 2000 个字符。" }, { status: 400 });
    }
    const llm = parseLlmRuntimeConfig(body.llm);
    if (!llm) {
      return noStoreJson(
        {
          ok: false,
          error: "请先在模型设置中配置 API Key 和模型。",
          code: "LLM_CONFIG_REQUIRED"
        },
        { status: 400 }
      );
    }

    const resources = await getResources();
    const result = await analyzeProjectWithAI(input, resources, llm);
    const durationMs = Math.round(performance.now() - startedAt);
    return noStoreJson(
      {
        ok: true,
        result,
        meta: {
          durationMs,
          cacheStatus: result.cacheStatus,
          provider: llm.provider,
          model: llm.model
        }
      },
      {
        headers: {
          "Server-Timing": `analyze;dur=${durationMs}`,
          "X-Analysis-Cache": result.cacheStatus
        }
      }
    );
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return noStoreJson({ ok: false, error: error.message }, { status: error.status });
    }
    if (error instanceof LlmProviderRequestError) {
      return noStoreJson(
        {
          ok: false,
          error: getPublicLlmErrorMessage(error),
          code: "LLM_PROVIDER_ERROR",
          requestId
        },
        { status: error.status === 429 ? 429 : 502 }
      );
    }

    console.error(`[analyze:${requestId}] request failed`, error);
    return noStoreJson(
      { ok: false, error: "项目分析暂时失败，请稍后重试。", requestId },
      { status: 500 }
    );
  } finally {
    activeAnalyses = Math.max(0, activeAnalyses - 1);
  }
}

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function isSecureKeyTransport(request: Request) {
  const forwardedProto = request.headers.get("x-forwarded-proto")
    ?.split(",", 1)[0]
    ?.trim()
    .toLowerCase();
  if (forwardedProto) return forwardedProto === "https";

  const url = new URL(request.url);
  const isDirectLoopback = ["localhost", "127.0.0.1", "::1"].includes(url.hostname)
    && !request.headers.has("x-forwarded-for")
    && !request.headers.has("x-real-ip");
  return isDirectLoopback || url.protocol === "https:";
}
