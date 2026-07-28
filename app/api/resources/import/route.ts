import { validateGitHubParsedResource } from "@/lib/github-import";
import { importResourceWithTags } from "@/lib/db/resources";
import {
  adminSurfaceUnavailable,
  enforceRateLimit,
  noStoreJson,
  readJsonBody,
  RequestValidationError
} from "@/lib/server-security";

export async function POST(request: Request) {
  const unavailable = adminSurfaceUnavailable();
  if (unavailable) return unavailable;

  const rateLimited = enforceRateLimit(request, "resource-import", 10, 10 * 60 * 1000);
  if (rateLimited) return rateLimited;

  try {
    const payload = await readJsonBody<{ resource?: unknown }>(request, 64 * 1024);
    const resource = validateGitHubParsedResource(payload.resource);
    if (!resource) {
      return noStoreJson({ ok: false, error: "待保存资源未通过服务器校验。" }, { status: 400 });
    }

    const data = await importResourceWithTags(resource);
    return noStoreJson({ ok: true, resourceId: data.id, slug: data.slug });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return noStoreJson({ ok: false, error: error.message }, { status: error.status });
    }
    console.error("[resource-import] request failed", error);
    return noStoreJson({ ok: false, error: "保存资源失败。" }, { status: 500 });
  }
}
