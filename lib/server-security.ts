import "server-only";

import { NextResponse } from "next/server";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimits = new Map<string, RateLimitEntry>();
let rateLimitChecks = 0;

export class RequestValidationError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

export async function readJsonBody<T>(request: Request, maxBytes: number): Promise<T> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) {
    throw new RequestValidationError("请求必须使用 application/json。", 415);
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new RequestValidationError("请求内容过大。", 413);
  }

  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > maxBytes) {
    throw new RequestValidationError("请求内容过大。", 413);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new RequestValidationError("请求体不是有效 JSON。", 400);
  }
}

export function enforceRateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowMs: number
) {
  const now = Date.now();
  const key = `${scope}:${getClientIp(request)}`;
  const current = rateLimits.get(key);

  if (!current || current.resetAt <= now) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    pruneRateLimits(now);
    return null;
  }

  if (current.count >= limit) {
    const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    return NextResponse.json(
      { ok: false, error: "请求过于频繁，请稍后重试。" },
      {
        status: 429,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": String(retryAfter)
        }
      }
    );
  }

  current.count += 1;
  return null;
}

export function adminSurfaceUnavailable() {
  if (process.env.NODE_ENV !== "production") return null;
  return NextResponse.json(
    { ok: false, error: "Not Found" },
    { status: 404, headers: { "Cache-Control": "no-store" } }
  );
}

export function noStoreJson(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "no-store");
  return NextResponse.json(data, { ...init, headers });
}

function getClientIp(request: Request) {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const forwarded = request.headers.get("x-forwarded-for")
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .at(-1);
  return forwarded || "local";
}

function pruneRateLimits(now: number) {
  rateLimitChecks += 1;
  if (rateLimitChecks % 100 !== 0 && rateLimits.size < 5000) return;

  rateLimits.forEach((entry, key) => {
    if (entry.resetAt <= now) rateLimits.delete(key);
  });
}
