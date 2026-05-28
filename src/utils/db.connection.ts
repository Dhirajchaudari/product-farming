import { Pool } from "pg";

import { getEnvConfig } from "./env.config.js";

let dbPool: Pool | null = null;

export function getDbPool(): Pool {
  if (!dbPool) {
    const { databaseUrl } = getEnvConfig();
    dbPool = new Pool({
      connectionString: databaseUrl
    });
  }

  return dbPool;
}

export async function pingDatabase(): Promise<boolean> {
  const pool = getDbPool();
  const result = await pool.query("select 1 as ok");
  return result.rows[0]?.ok === 1;
}
