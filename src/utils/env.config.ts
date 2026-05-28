import dotenv from "dotenv";

dotenv.config();

export interface EnvConfig {
  nodeEnv: string;
  host: string;
  port: number;
  databaseUrl: string;
  redisUrl: string;
  jwtPublicKey: string;
  jwtPrivateKey: string;
}

let cachedConfig: EnvConfig | null = null;

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function decodeBase64Key(value: string): string {
  return Buffer.from(value, "base64").toString("utf8");
}

export function getEnvConfig(): EnvConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  cachedConfig = {
    nodeEnv: process.env.NODE_ENV ?? "development",
    host: process.env.HOST ?? "0.0.0.0",
    port: Number(process.env.PORT ?? "8000"),
    databaseUrl: getRequiredEnv("DATABASE_URL"),
    redisUrl: getRequiredEnv("REDIS_URL"),
    jwtPublicKey: decodeBase64Key(getRequiredEnv("PUBLIC_KEY")),
    jwtPrivateKey: decodeBase64Key(getRequiredEnv("PRIVATE_KEY"))
  };

  return cachedConfig;
}
