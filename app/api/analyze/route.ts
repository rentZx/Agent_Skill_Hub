import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { analyzeProjectWithAI } from "@/lib/analyzer-service";
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

  if (activeAnalyses >= maxConcurrentAnalyses) {
    return NextResponse.json(
      { ok: false, error: "分析服务当前繁忙，请稍后重试。" },
      { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "10" } }
    );
  }

  const requestId = randomUUID();
  activeAnalyses += 1;

  try {
    const body = await readJsonBody<{ input?: unknown }>(request, 8 * 1024);
    if (typeof body.input !== "string") {
      return noStoreJson({ ok: false, error: "请输入项目描述。" }, { status: 400 });
    }

    const input = body.input?.trim();
    if (!input) return noStoreJson({ ok: false, error: "请输入项目描述。" }, { status: 400 });
    if (input.length > 2000) {
      return noStoreJson({ ok: false, error: "项目描述不能超过 2000 个字符。" }, { status: 400 });
    }

    const resources = await getResources();
    const result = await analyzeProjectWithAI(input, resources);
    const durationMs = Math.round(performance.now() - startedAt);
    return noStoreJson(
      {
        ok: true,
        result,
        meta: {
          durationMs,
          cacheStatus: result.cacheStatus
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
