import { buildApp } from "./app.js";
import { getEnvConfig } from "./utils/env.config.js";

const app = buildApp();
const env = getEnvConfig();
const port = env.port;
const host = env.host;

async function start(): Promise<void> {
  try {
    await app.listen({ port, host });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void start();
