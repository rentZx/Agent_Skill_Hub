import Link from "next/link";
import type { ReactNode } from "react";
import { Boxes, Database, Heart, Home, Search, Sparkles } from "lucide-react";

const navItems = [
  { href: "/", label: "首页", icon: Home },
  { href: "/resources", label: "资源库", icon: Boxes },
  { href: "/search", label: "搜索", icon: Search },
  { href: "/recommend", label: "推荐", icon: Sparkles },
  { href: "/favorites", label: "收藏", icon: Heart },
  { href: "/admin", label: "管理", icon: Database }
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(109,232,219,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(109,232,219,0.08)_1px,transparent_1px)] bg-[size:48px_48px] opacity-30 animate-grid-drift" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(34,211,238,0.10),transparent_34%,rgba(99,102,241,0.12)_62%,transparent)]" />
        <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-cyan-300/10 to-transparent" />
      </div>

      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-5">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-md border border-cyan-300/30 bg-gradient-to-br from-cyan-300/20 to-violet-400/15 text-sm font-semibold text-cyan-100 shadow-[0_0_22px_rgba(103,232,249,0.12)]">
              AS
            </span>
            <span>
              <span className="block text-sm font-semibold leading-4">Agent Skill Hub</span>
              <span className="block text-xs text-muted-foreground">AI 能力选型与插件导航平台</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:bg-white/[0.08] hover:text-foreground">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-5 sm:py-8">{children}</main>

      <nav className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-6 rounded-lg border border-white/10 bg-slate-950/85 p-1 shadow-glass backdrop-blur-xl md:hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 rounded-md px-2 py-2 text-[11px] text-muted-foreground transition hover:bg-white/[0.08] hover:text-foreground"
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
