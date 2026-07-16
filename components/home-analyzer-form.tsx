"use client";

import { useState } from "react";
import { ArrowRight, ClipboardList } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function HomeAnalyzerForm() {
  const router = useRouter();
  const [input, setInput] = useState("");

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const prompt = input.trim();
    if (!prompt) return;
    router.push(`/analyze?prompt=${encodeURIComponent(prompt)}`);
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-cyan-300/25 bg-slate-950/68 p-2 shadow-[0_0_48px_rgba(34,211,238,0.18)] backdrop-blur-xl">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <div className="flex min-h-24 items-start gap-3 rounded-md border border-white/10 bg-white/[0.055] p-4">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-cyan-300/20 bg-cyan-300/10 text-cyan-100"><ClipboardList className="h-4 w-4" /></span>
          <textarea value={input} onChange={(event) => setInput(event.target.value)} rows={3} className="min-h-16 w-full resize-none bg-transparent text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-500" placeholder="输入你的项目需求，例如：我要开发一个画室管理系统，包含课程、排课、学生和缴费" />
        </div>
        <Button type="submit" size="lg" className="h-full min-h-14 shrink-0 px-5">生成方案 <ArrowRight className="h-4 w-4" /></Button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 px-1 text-xs text-slate-400"><span className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1">DeepSeek 分析</span><span className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1">数据库检索</span><span className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1">GitHub 实时发现</span><span className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1">风险提示</span></div>
    </form>
  );
}
