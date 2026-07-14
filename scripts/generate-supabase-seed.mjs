import fs from "node:fs";

const source = fs.readFileSync("data/seed-resources.ts", "utf8");
const match = source.match(/export const seedResources = ([\s\S]*?)\] satisfies/);

if (!match) {
  throw new Error("Could not find seedResources array.");
}

const resources = Function(`return ${match[1]}]`)();

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeSql(value) {
  return String(value).replace(/'/g, "''");
}

function textArray(values) {
  return `array[${values.map((value) => `'${escapeSql(value)}'`).join(", ")}]::text[]`;
}

const sql = [
  "-- Seed data generated from data/seed-resources.ts.",
  "-- Run supabase/schema.sql first.",
  "",
  "begin;",
  ""
];

for (const resource of resources) {
  const resourceSlug = slugify(resource.name);

  sql.push(
    "insert into public.resources (slug, name, type, description, supported_agents, install_command, use_cases, risk_level, trust_score, fit_score, repo_url, source, last_updated)",
    `values ('${escapeSql(resourceSlug)}', '${escapeSql(resource.name)}', '${escapeSql(resource.type)}', '${escapeSql(resource.description)}', ${textArray(resource.supported_agents)}, '${escapeSql(resource.install_command)}', ${textArray(resource.use_cases)}, '${escapeSql(resource.risk_level)}', ${resource.trust_score}, ${resource.fit_score}, '${escapeSql(resource.repo_url)}', '${escapeSql(resource.source)}', '${escapeSql(resource.last_updated)}')`,
    "on conflict (slug) do update set name = excluded.name, type = excluded.type, description = excluded.description, supported_agents = excluded.supported_agents, install_command = excluded.install_command, use_cases = excluded.use_cases, risk_level = excluded.risk_level, trust_score = excluded.trust_score, fit_score = excluded.fit_score, repo_url = excluded.repo_url, source = excluded.source, last_updated = excluded.last_updated;"
  );

  for (const tag of resource.tags) {
    const tagSlug = slugify(tag);
    sql.push(
      `insert into public.tags (slug, name, category) values ('${escapeSql(tagSlug)}', '${escapeSql(tag)}', 'seed') on conflict (slug) do update set name = excluded.name;`,
      `insert into public.resource_tags (resource_id, tag_id) select resources.id, tags.id from public.resources, public.tags where resources.slug = '${escapeSql(resourceSlug)}' and tags.slug = '${escapeSql(tagSlug)}' on conflict do nothing;`
    );
  }

  sql.push("");
}

sql.push("commit;");

fs.mkdirSync("supabase", { recursive: true });
fs.writeFileSync("supabase/seed.sql", sql.join("\n"));
console.log(`generated ${resources.length} resources into supabase/seed.sql`);
