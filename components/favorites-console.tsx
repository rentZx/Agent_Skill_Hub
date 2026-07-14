"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Bookmark, Search } from "lucide-react";
import { ResourceCard } from "@/components/resource-card";
import { Button } from "@/components/ui/button";
import type { Resource } from "@/lib/types";

const favoritesKey = "agent-skill-hub:favorites";

export function FavoritesConsole({ resources }: { resources: Resource[] }) {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  useEffect(() => {
    const stored = window.localStorage.getItem(favoritesKey);
    if (stored) {
      setFavoriteIds(JSON.parse(stored) as string[]);
    }
  }, []);

  const favoriteResources = useMemo(
    () => resources.filter((resource) => favoriteIds.includes(resource.id)),
    [resources, favoriteIds]
  );

  return (
    <div className="space-y-7 pb-10">
      <section className="rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(8,13,28,0.92),rgba(14,23,48,0.78)_52%,rgba(31,20,70,0.55))] p-5 shadow-glass sm:p-7">
        <div className="inline-flex items-center gap-2 rounded-md border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100">
          <Bookmark className="h-3.5 w-3.5" />
          本地收藏
        </div>
        <h1 className="mt-4 text-3xl font-semibold sm:text-5xl">已收藏资源</h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">
          收藏暂时保存在当前浏览器 localStorage 中，用于 V1.0 快速保存常用资源。
        </p>
      </section>

      {favoriteResources.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {favoriteResources.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-6 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-md border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
            <Search className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-xl font-semibold">还没有收藏资源</h2>
          <p className="mt-2 text-sm text-muted-foreground">去搜索页点击资源右上角收藏按钮后，会出现在这里。</p>
          <Button asChild className="mt-5">
            <Link href="/search">打开搜索页</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
