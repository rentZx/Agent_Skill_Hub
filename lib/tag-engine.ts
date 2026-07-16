export type ProjectTag = {
  slug: string;
  label: string;
  category: "industry" | "domain" | "workflow" | "technology";
  weight: number;
};

const tagRules: Array<{ terms: string[]; tags: ProjectTag[] }> = [
  { terms: ["做饭", "菜谱", "食谱", "吃什么", "备菜", "烹饪", "饭菜", "料理"], tags: [
    { slug: "food", label: "Food", category: "industry", weight: 10 },
    { slug: "recipe", label: "Recipe", category: "domain", weight: 9 },
    { slug: "meal-planning", label: "Meal Planning", category: "domain", weight: 8 },
    { slug: "ingredients", label: "Ingredients", category: "domain", weight: 8 },
    { slug: "cooking-steps", label: "Cooking Steps", category: "workflow", weight: 7 },
    { slug: "servings", label: "Servings", category: "workflow", weight: 7 },
    { slug: "random-meal", label: "Random Meal", category: "workflow", weight: 6 }
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
