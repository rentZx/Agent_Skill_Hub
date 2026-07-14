import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[62vh] items-center justify-center pb-10">
      <section className="w-full max-w-2xl rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(8,13,28,0.94),rgba(14,23,48,0.80)_52%,rgba(39,24,88,0.58))] p-6 text-center shadow-glass sm:p-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
          <Search className="h-5 w-5" />
        </div>
        <h1 className="mt-5 text-3xl font-semibold">没有找到这个页面</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          该资源可能不存在，或链接已经失效。你可以返回资源库继续搜索 Skills、MCP Servers、GitHub 插件和 UI 组件。
        </p>
        <Button asChild className="mt-6">
          <Link href="/resources">
            <ArrowLeft className="h-4 w-4" />
            返回资源库
          </Link>
        </Button>
      </section>
    </div>
  );
}
