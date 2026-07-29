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
  const migrationDirectory = path.join(process.cwd(), "db", "migrations");
  const migrationFiles = (await fs.readdir(migrationDirectory))
    .filter((file) => /^\d+.*\.sql$/i.test(file))
    .sort((left, right) => left.localeCompare(right));

  for (const file of migrationFiles) {
    const migration = await fs.readFile(path.join(migrationDirectory, file), "utf8");
    await client.unsafe(migration);
    console.log(`Applied ${file}`);
  }

  console.log(`Resource model V2 migrations completed (${migrationFiles.length}).`);
}

void main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end();
  });
