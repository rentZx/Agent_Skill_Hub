"use client";

import { FormEvent, useState } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";

export function ResourceSearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    router.push(value ? `/search?query=${encodeURIComponent(value)}` : "/search");
  }

  return (
    <form onSubmit={submit} className="mt-5 rounded-lg border border-cyan-300/20 bg-slate-950/58 p-2 shadow-focus-glow backdrop-blur-xl">
      <label className="flex min-h-12 items-center gap-3 rounded-md border border-white/10 bg-white/[0.04] px-3 transition focus-within:border-cyan-300/40">
        <Search className="h-4 w-4 shrink-0 text-cyan-200" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="搜索资源"
          placeholder="搜索文档解析、网页抓取、GitHub MCP、Playwright、shadcn/ui、Supabase..."
          className="min-w-0 flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
        />
        <button type="submit" className="rounded-md border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-xs font-medium text-cyan-100 transition hover:border-cyan-300/45 hover:bg-cyan-300/15">
          搜索
        </button>
      </label>
    </form>
  );
}
