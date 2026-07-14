import { NextResponse } from "next/server";
import type { GitHubParsedResource } from "@/lib/github-import";
import { importResourceWithTags } from "@/lib/db/resources";

export async function POST(request: Request) {
  let payload: { resource?: GitHubParsedResource };
  try {
    payload = (await request.json()) as { resource?: GitHubParsedResource };
  } catch {
    return NextResponse.json({ ok: false, error: "请求体不是有效 JSON。" }, { status: 400 });
  }

  const { resource } = payload;

  if (!resource) {
    return NextResponse.json({ ok: false, error: "缺少待保存的资源解析结果。" }, { status: 400 });
  }

  try {
    const data = await importResourceWithTags(resource);
    return NextResponse.json({ ok: true, resourceId: data.id, slug: data.slug });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "保存资源失败。" },
      { status: 400 }
    );
  }
}
