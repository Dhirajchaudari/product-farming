import dotenv from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { resolveDatabaseUrl, type ResolvedDatabaseUrl } from "./database-url.js";
import { normalizeRedisUrl } from "./redis-url.js";

function loadEnvFiles(): void {
  const cwd = process.cwd();
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const candidates =
    nodeEnv === "production"
      ? [".env.production", ".env"]
      : [".env.local", ".env"];

  for (const file of candidates) {
    const path = resolve(cwd, file);
    if (existsSync(path)) {
      dotenv.config({ path });
    }
  }
}

loadEnvFiles();

export interface EnvConfig {
  nodeEnv: string;
  host: string;
  port: number;
  databaseUrl: string;
  database: ResolvedDatabaseUrl;
  redisUrl: string;
  jwtPublicKey: string;
  jwtPrivateKey: string;
  smtpUser?: string;
  smtpPassword?: string;
  emailFromAddress?: string;
  corsOrigins: string[];
  otpLength: number;
  otpTtlMinutes: number;
  employeeInviteOtpTtlMinutes: number;
  passwordMinLength: number;
  frontendBaseUrl: string;
  setPasswordPath: string;
  cloudinaryCloudName?: string;
  cloudinaryApiKey?: string;
  cloudinaryApiSecret?: string;
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

function parseCorsOrigins(value: string | undefined): string[] {
  if (!value) {
    return [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://app.orbitalops.net",
      "https://www.app.orbitalops.net"
    ];
  }
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function resetEnvConfigForTests(): void {
  cachedConfig = null;
}

export function getEnvConfig(): EnvConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const database = resolveDatabaseUrl();

  cachedConfig = {
    nodeEnv: process.env.NODE_ENV ?? "development",
    host: process.env.HOST ?? "0.0.0.0",
    port: Number(process.env.PORT ?? "8000"),
    databaseUrl: database.connectionString,
    database,
    redisUrl: normalizeRedisUrl(getRequiredEnv("REDIS_URL")),
    jwtPublicKey: decodeBase64Key(getRequiredEnv("PUBLIC_KEY")),
    jwtPrivateKey: decodeBase64Key(getRequiredEnv("PRIVATE_KEY")),
    smtpUser: process.env.SMTP_USER,
    smtpPassword: process.env.SMTP_PASSWORD,
    emailFromAddress: process.env.EMAIL_FROM_ADDRESS,
    corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
    otpLength: Number(process.env.OTP_LENGTH ?? "6"),
    otpTtlMinutes: Number(process.env.OTP_TTL_MINUTES ?? "10"),
    employeeInviteOtpTtlMinutes: Number(process.env.EMPLOYEE_INVITE_OTP_TTL_MINUTES ?? "10080"),
    passwordMinLength: Number(process.env.PASSWORD_MIN_LENGTH ?? "8"),
    frontendBaseUrl: process.env.FRONTEND_BASE_URL ?? "http://localhost:3000",
    setPasswordPath: process.env.SET_PASSWORD_PATH ?? "/auth/set-password",
    cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
    cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
    cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET
  };

  return cachedConfig;
}
