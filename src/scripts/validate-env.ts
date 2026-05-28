import { checkDatabaseConnection, disconnectPrisma } from "../utils/prisma.connection.js";
import { getEnvConfig } from "../utils/env.config.js";

async function main(): Promise<void> {
  const env = getEnvConfig();
  console.log(`Database host: ${env.database.host}`);
  console.log(`Database name: ${env.database.database}`);

  await checkDatabaseConnection();
  console.log("Database connection: OK");
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Validation failed:", message);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectPrisma();
  });
