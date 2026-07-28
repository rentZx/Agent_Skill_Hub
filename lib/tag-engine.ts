export type ProjectTag = {
  slug: string;
  label: string;
  category: "industry" | "domain" | "workflow" | "technology";
  weight: number;
};

const tagRules: Array<{ terms: string[]; tags: ProjectTag[] }> = [
  { terms: ["短视频", "视频生成", "文生视频", "文本转视频", "ai视频", "ai 视频", "short video", "text-to-video", "video generation"], tags: [
    { slug: "ai-video-generator", label: "AI Video Generator", category: "domain", weight: 10 },
    { slug: "short-video", label: "Short Video", category: "industry", weight: 10 },
    { slug: "text-to-video", label: "Text to Video", category: "workflow", weight: 9 },
    { slug: "video-composition", label: "Video Composition", category: "workflow", weight: 9 },
    { slug: "script-generation", label: "Script Generation", category: "workflow", weight: 8 },
    { slug: "stock-footage", label: "Stock Footage", category: "domain", weight: 8 },
    { slug: "text-to-speech", label: "Text to Speech", category: "technology", weight: 8 },
    { slug: "subtitles", label: "Subtitles", category: "workflow", weight: 8 },
    { slug: "ffmpeg", label: "FFmpeg", category: "technology", weight: 7 },
    { slug: "moviepy", label: "MoviePy", category: "technology", weight: 7 },
    { slug: "vertical-video", label: "Vertical Video", category: "domain", weight: 7 },
    { slug: "content-creation", label: "Content Creation", category: "industry", weight: 7 }
  ] },
  { terms: ["2d转3d", "2d 转 3d", "image-to-3d", "image to 3d", "img2threejs", "threejs", "three.js"], tags: [
    { slug: "image-to-3d", label: "Image to 3D", category: "domain", weight: 10 },
    { slug: "computer-graphics", label: "Computer Graphics", category: "industry", weight: 9 },
    { slug: "threejs", label: "Three.js", category: "technology", weight: 9 },
    { slug: "webgl", label: "WebGL", category: "technology", weight: 8 },
    { slug: "depth-estimation", label: "Depth Estimation", category: "workflow", weight: 8 },
    { slug: "mesh-generation", label: "Mesh Generation", category: "workflow", weight: 8 },
    { slug: "model-viewer", label: "3D Model Viewer", category: "workflow", weight: 7 },
    { slug: "model-export", label: "3D Model Export", category: "workflow", weight: 7 }
  ] },
  { terms: ["美食", "餐饮"], tags: [
    { slug: "food", label: "Food", category: "industry", weight: 10 },
    { slug: "food-discovery", label: "Food Discovery", category: "domain", weight: 8 },
    { slug: "food-content", label: "Food Content", category: "domain", weight: 7 },
    { slug: "search", label: "Search", category: "workflow", weight: 6 },
    { slug: "recommendation", label: "Recommendation", category: "workflow", weight: 6 }
  ] },
  { terms: ["做饭", "菜谱", "食谱", "吃什么", "备菜", "烹饪", "饭菜", "料理"], tags: [
    { slug: "food", label: "Food", category: "industry", weight: 10 },
    { slug: "recipe", label: "Recipe", category: "domain", weight: 9 },
    { slug: "chinese-recipes", label: "Chinese Recipes", category: "domain", weight: 9 },
    { slug: "ingredient-recommendation", label: "Ingredient Recommendation", category: "workflow", weight: 9 },
    { slug: "meal-planning", label: "Meal Planning", category: "domain", weight: 8 },
    { slug: "ingredients", label: "Ingredients", category: "domain", weight: 8 },
    { slug: "dietary-restrictions", label: "Dietary Restrictions", category: "domain", weight: 8 },
    { slug: "food-allergies", label: "Food Allergies", category: "domain", weight: 8 },
    { slug: "personalized-nutrition", label: "Personalized Nutrition", category: "domain", weight: 8 },
    { slug: "age-aware", label: "Age-aware", category: "workflow", weight: 8 },
    { slug: "cooking-steps", label: "Cooking Steps", category: "workflow", weight: 7 },
    { slug: "servings", label: "Servings", category: "workflow", weight: 7 },
    { slug: "portion-scaling", label: "Portion Scaling", category: "workflow", weight: 7 },
    { slug: "recipe-mcp", label: "Recipe MCP", category: "technology", weight: 7 },
    { slug: "shopping-list", label: "Shopping List", category: "workflow", weight: 6 },
    { slug: "random-meal", label: "Random Meal", category: "workflow", weight: 6 }
  ] },
  { terms: ["炒股", "股票", "股市", "证券行情", "a股", "量化交易", "stock market", "stock trading"], tags: [
    { slug: "stock-market", label: "Stock Market", category: "industry", weight: 10 },
    { slug: "financial-data", label: "Financial Data", category: "domain", weight: 10 },
    { slug: "market-data", label: "Market Data", category: "domain", weight: 9 },
    { slug: "real-time-quotes", label: "Real-time Quotes", category: "workflow", weight: 9 },
    { slug: "a-share", label: "A-share", category: "domain", weight: 9 },
    { slug: "technical-analysis", label: "Technical Analysis", category: "workflow", weight: 8 },
    { slug: "quantitative-trading", label: "Quantitative Trading", category: "domain", weight: 8 },
    { slug: "backtesting", label: "Backtesting", category: "workflow", weight: 8 },
    { slug: "trading-strategy", label: "Trading Strategy", category: "workflow", weight: 7 },
    { slug: "multi-agent-research", label: "Multi-agent Research", category: "technology", weight: 6 }
  ] },
  { terms: ["画室", "绘画", "美术", "培训", "教育"], tags: [
    { slug: "education", label: "Education", category: "industry", weight: 10 },
    { slug: "course", label: "Course", category: "domain", weight: 8 },
    { slug: "student", label: "Student", category: "domain", weight: 8 },
    { slug: "teacher", label: "Teacher", category: "domain", weight: 7 },
    { slug: "parent", label: "Parent", category: "domain", weight: 6 },
    { slug: "schedule", label: "Schedule", category: "workflow", weight: 7 },
    { slug: "payment", label: "Payment", category: "workflow", weight: 5 },
    { slug: "wechat", label: "WeChat", category: "technology", weight: 4 }
  ] },
  { terms: ["crm", "客户", "线索", "销售", "获客"], tags: [
    { slug: "crm", label: "CRM", category: "industry", weight: 10 },
    { slug: "customer", label: "Customer", category: "domain", weight: 8 },
    { slug: "lead", label: "Lead", category: "domain", weight: 8 },
    { slug: "sales", label: "Sales", category: "workflow", weight: 7 },
    { slug: "pipeline", label: "Pipeline", category: "workflow", weight: 6 },
    { slug: "reporting", label: "Reporting", category: "workflow", weight: 4 }
  ] },
  { terms: ["erp", "库存", "采购", "供应链", "财务"], tags: [
    { slug: "erp", label: "ERP", category: "industry", weight: 10 },
    { slug: "inventory", label: "Inventory", category: "domain", weight: 8 },
    { slug: "procurement", label: "Procurement", category: "workflow", weight: 7 },
    { slug: "order", label: "Order", category: "workflow", weight: 6 },
    { slug: "finance", label: "Finance", category: "domain", weight: 6 }
  ] },
  { terms: ["agent", "智能体", "ai", "人工智能"], tags: [
    { slug: "ai", label: "AI", category: "industry", weight: 10 },
    { slug: "agent", label: "Agent", category: "domain", weight: 9 },
    { slug: "tool-calling", label: "Tool Calling", category: "technology", weight: 7 },
    { slug: "knowledge", label: "Knowledge", category: "workflow", weight: 6 },
    { slug: "workflow", label: "Workflow", category: "workflow", weight: 6 }
  ] }
];

export function extractProjectTags(input: string): ProjectTag[] {
  const normalized = input.toLowerCase();
  const matched = tagRules.flatMap((rule) =>
    rule.terms.some((term) => normalized.includes(term.toLowerCase())) ? rule.tags : []
  );
  const defaults: ProjectTag[] = [
    { slug: "web", label: "Web", category: "technology", weight: 3 },
    { slug: "saas", label: "SaaS", category: "industry", weight: 3 },
    { slug: "dashboard", label: "Dashboard", category: "workflow", weight: 3 },
    { slug: "postgresql", label: "PostgreSQL", category: "technology", weight: 3 },
    { slug: "nextjs", label: "Next.js", category: "technology", weight: 3 }
  ];
  const unique = new Map<string, ProjectTag>();
  [...matched, ...defaults].forEach((tag) => unique.set(tag.slug, tag));
  return [...unique.values()].sort((a, b) => b.weight - a.weight);
}
