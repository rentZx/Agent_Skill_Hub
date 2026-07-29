import fs from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required.");

const client = postgres(databaseUrl, { max: 1, prepare: false });

async function main() {
  const migrationPath = path.join(process.cwd(), "db", "migrations", "0001_resource_model_v2.sql");
  const migration = await fs.readFile(migrationPath, "utf8");

  await client.unsafe(migration);
  console.log("Resource model V2 migration completed.");
}

void main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end();
  });
