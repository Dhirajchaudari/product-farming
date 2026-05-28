import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

import { getEnvConfig } from "./env.config.js";

let prisma: PrismaClient | null = null;
let adapter: PrismaPg | null = null;

export function getPrismaClient(): PrismaClient {
  if (!adapter) {
    const pool = new Pool({
      connectionString: getEnvConfig().databaseUrl
    });
    adapter = new PrismaPg(pool);
  }

  if (!prisma) {
    prisma = new PrismaClient({
      adapter
    });
  }
  return prisma;
}
