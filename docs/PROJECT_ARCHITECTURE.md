# AI Skills / MCP / GitHub AI 插件智能选型平台

## 1. 项目定位

面向 AI 应用开发者、Agent 工程师和团队技术负责人。用户输入想开发的项目后，平台自动推荐可用的 Agent Skills、MCP Servers、GitHub AI 插件、UI 组件库和模板仓库，并生成可直接交给 Codex 的开发组合方案。

首版重点不是做资源大全，而是做“开发组合决策台”：输入需求、检索资源、评估风险、保存组合、生成 Codex 可执行方案。

## 2. 技术架构

### 前端

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui 风格基础组件
- Motion 动效
- Bento Grid 信息组织
- 深色科技风、玻璃拟态卡片、动态网格背景、克制渐变高光

### 后端与数据

- Supabase Auth：后续用于用户收藏、管理权限
- Supabase Postgres：资源、标签、收藏、推荐记录、风险报告
- pgvector：资源 embedding 与项目描述 embedding 相似度召回
- Edge Functions 或 Next.js Route Handlers：推荐组合生成、GitHub 数据同步、风险分析

### 推荐流程

1. 用户输入项目描述。
2. 文本标准化：提取目标、技术栈、部署环境、风险偏好、UI 风格、数据需求。
3. 向量召回：用 pgvector 在 resources 中找语义相近资源。
4. 规则重排：按类型覆盖度、兼容工具、风险等级、热度、维护状态排序。
5. 组合生成：输出 Skills、MCP、GitHub AI 插件、UI 库、模板仓库、实施顺序。
6. Codex 方案生成：生成一段可直接交给 Codex 的开发指令。

## 3. 目录结构

```txt
app/
  page.tsx                         首页
  search/page.tsx                  搜索页
  resources/[id]/page.tsx          资源详情页
  recommend/page.tsx               项目推荐页
  favorites/page.tsx               收藏页
  admin/page.tsx                   管理页
  globals.css                      全局样式与主题变量
components/
  app-shell.tsx                    顶部导航和页面框架
  dynamic-grid-background.tsx      动态网格背景
  resource-card.tsx                资源卡片
  recommendation-builder.tsx       项目推荐交互
  search-console.tsx               搜索和筛选控制台
  ui/                              shadcn 风格基础组件
lib/
  data.ts                          首版 mock 数据
  recommendation.ts                本地推荐与组合生成逻辑
  types.ts                         类型定义
  utils.ts                         className 工具
supabase/
  schema.sql                       数据库表、索引、RLS 建议
```

## 4. 数据库设计

### resources

资源主表，统一存储 Skills、MCP Servers、GitHub AI 插件、UI 组件库和模板仓库。

- `id uuid primary key`
- `slug text unique not null`
- `name text not null`
- `type resource_type not null`
- `summary text not null`
- `description text`
- `use_cases text[] default '{}'`
- `install_command text`
- `compatible_tools text[] default '{}'`
- `github_url text`
- `github_stars integer default 0`
- `github_forks integer default 0`
- `github_last_commit timestamptz`
- `risk_level risk_level default 'medium'`
- `risk_notes text`
- `quality_score numeric(4,2) default 0`
- `popularity_score numeric(4,2) default 0`
- `embedding vector(1536)`
- `metadata jsonb default '{}'`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

### tags

- `id uuid primary key`
- `name text unique not null`
- `slug text unique not null`
- `category text`
- `created_at timestamptz default now()`

### resource_tags

- `resource_id uuid references resources(id) on delete cascade`
- `tag_id uuid references tags(id) on delete cascade`
- `primary key(resource_id, tag_id)`

### collections

收藏与组合集合。首版可作为用户收藏列表，后续支持团队共享。

- `id uuid primary key`
- `user_id uuid`
- `name text not null`
- `description text`
- `resource_ids uuid[] default '{}'`
- `is_default boolean default false`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

### project_recommendations

保存用户项目描述、推荐结果和 Codex 方案。

- `id uuid primary key`
- `user_id uuid`
- `project_prompt text not null`
- `normalized_requirements jsonb default '{}'`
- `recommended_resource_ids uuid[] default '{}'`
- `recommendation jsonb not null`
- `codex_plan text`
- `created_at timestamptz default now()`

### risk_reports

资源风险分析记录。

- `id uuid primary key`
- `resource_id uuid references resources(id) on delete cascade`
- `risk_level risk_level not null`
- `security_score numeric(4,2)`
- `maintenance_score numeric(4,2)`
- `license_score numeric(4,2)`
- `compatibility_score numeric(4,2)`
- `summary text not null`
- `signals jsonb default '{}'`
- `created_at timestamptz default now()`

## 5. 页面结构

### 首页

- 项目需求输入框
- 热门分类
- 热门 Skills
- 热门 MCP
- 推荐组合入口
- 高密度 Bento Grid 展示关键资源

### 搜索页

- 关键词搜索
- 类型筛选：Skill / MCP / GitHub AI Plugin / UI Library / Template
- 适配工具筛选：Codex / Claude / Cursor / VS Code / Supabase 等
- 风险等级筛选：low / medium / high
- 结果卡片展示质量分、热度、风险、安装命令

### 资源详情页

- 简介和适用场景
- 安装命令
- 兼容工具
- GitHub 数据
- 风险分析
- 推荐搭配资源

### 项目推荐页

- 用户输入项目描述
- 输出推荐资源组合
- 输出实施顺序
- 输出可直接交给 Codex 的开发组合方案

### 收藏页

- 保存常用资源
- 收藏资源按类型分组
- 后续支持导出组合方案

### 管理页

- 手动新增资源
- 编辑资源字段
- 维护标签、风险等级、兼容工具
- 后续支持 GitHub URL 自动补全

## 6. 开发任务拆分

### Phase 1：前端 MVP

- 创建 Next.js + TypeScript + Tailwind 项目。
- 实现深色 AI SaaS 基础视觉系统。
- 实现 6 个首版页面。
- 用 mock 数据完成资源检索、筛选、详情、收藏、推荐组合。

### Phase 2：Supabase 数据接入

- 创建 Supabase schema。
- 编写资源 CRUD API。
- 接入收藏与推荐记录。
- 为 resources 增加 pgvector embedding 检索。

### Phase 3：推荐引擎

- 项目描述结构化解析。
- 向量召回 + 规则重排。
- 类型覆盖度评分。
- 风险等级与维护状态惩罚。
- Codex Prompt 生成器。

### Phase 4：资源增长与管理

- GitHub 数据同步。
- 风险报告自动生成。
- 管理页批量导入。
- 模板仓库质量评估。

### Phase 5：团队化

- 用户登录。
- 团队收藏夹。
- 推荐方案版本历史。
- 一键导出为 Codex 开发指令。
