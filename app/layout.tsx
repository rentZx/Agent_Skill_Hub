import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "Agent Skill Hub",
  description: "AI 能力选型与插件导航平台，面向 Skills、MCP Servers、GitHub 插件、UI 组件库和模板仓库的组合推荐。"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="dark">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
