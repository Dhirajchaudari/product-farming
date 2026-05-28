import "dotenv/config";

import { defineConfig } from "prisma/config";

function buildDatabaseUrl(): string {
  const direct = process.env.DATABASE_URL?.trim();
  if (direct) {
    return direct;
  }

  const host = process.env.DATABASE_HOST?.trim() || process.env.PGHOST?.trim();
  const user = process.env.DATABASE_USER?.trim() || process.env.PGUSER?.trim();
  const password = process.env.DATABASE_PASSWORD ?? process.env.PGPASSWORD ?? "";
  const port = process.env.DATABASE_PORT?.trim() || process.env.PGPORT?.trim() || "5432";
  const database =
    process.env.DATABASE_NAME?.trim() ||
    process.env.PGDATABASE?.trim() ||
    process.env.POSTGRES_DB?.trim();

  if (host && user && database) {
    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
  }

  return "";
}

const DATABASE_URL = buildDatabaseUrl();

if (!DATABASE_URL) {
  throw new Error(
    "Missing DATABASE_URL or DATABASE_HOST/DATABASE_USER/DATABASE_NAME for Prisma migrations."
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations"
  },
  datasource: {
    url: DATABASE_URL
  }
});
