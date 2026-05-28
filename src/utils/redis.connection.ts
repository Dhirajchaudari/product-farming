import { Redis } from "ioredis";

import { getEnvConfig } from "./env.config.js";

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    const { redisUrl } = getEnvConfig();
    redisClient = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1
    });
  }
  return redisClient;
}

export async function connectRedis(): Promise<Redis> {
  const client = getRedisClient();
  if (client.status !== "ready") {
    await client.connect();
  }
  return client;
}
