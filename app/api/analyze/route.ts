import { NextResponse } from "next/server";
import { analyzeProjectWithAI } from "@/lib/analyzer-service";
import { getResources } from "@/lib/resources";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { input?: string };
    const input = body.input?.trim();
    if (!input) return NextResponse.json({ ok: false, error: "请输入项目描述。" }, { status: 400 });
    const resources = await getResources();
    const result = await analyzeProjectWithAI(input, resources);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "项目分析失败。";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
