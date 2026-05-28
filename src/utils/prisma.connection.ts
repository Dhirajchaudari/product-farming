import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

import { getEnvConfig } from "./env.config.js";

let prisma: PrismaClient | null = null;
let pool: Pool | null = null;
let adapter: PrismaPg | null = null;

export function getPrismaClient(): PrismaClient {
  if (!pool) {
    const { databaseUrl, database } = getEnvConfig();
    const needsSsl =
      databaseUrl.includes("sslmode=require") || database.host.includes("neon.tech");

    pool = new Pool({
      connectionString: databaseUrl,
      ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
      connectionTimeoutMillis: 30_000,
      max: 10
    });
    adapter = new PrismaPg(pool);
  }

  if (!prisma) {
    prisma = new PrismaClient({
      adapter: adapter!
    });
  }
  return prisma;
}

export async function checkDatabaseConnection(): Promise<void> {
  const client = getPrismaClient();
  await client.$queryRaw`SELECT 1`;
}

export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
  if (pool) {
    await pool.end();
    pool = null;
    adapter = null;
  }
}
