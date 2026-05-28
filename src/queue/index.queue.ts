import { Queue, Worker } from "bullmq";

import { getEnvConfig } from "../utils/env.config.js";
import { processAuthAuditJob, type AuthAuditJobData } from "./workers/auth.worker.js";

const AUTH_AUDIT_QUEUE_NAME = "auth-audit";

export interface QueueBootstrapResult {
  initialized: boolean;
  queues: string[];
}

let authAuditQueue: Queue<AuthAuditJobData> | null = null;
let authAuditWorker: Worker<AuthAuditJobData> | null = null;

function getBullConnection(): { host: string; port: number; username?: string; password?: string } {
  const { redisUrl } = getEnvConfig();
  const url = new URL(redisUrl);

  return {
    host: url.hostname,
    port: Number(url.port || "6379"),
    username: url.username || undefined,
    password: url.password || undefined
  };
}

export async function initializeQueues(): Promise<QueueBootstrapResult> {
  if (authAuditQueue && authAuditWorker) {
    return {
      initialized: true,
      queues: [AUTH_AUDIT_QUEUE_NAME]
    };
  }

  const connection = getBullConnection();
  authAuditQueue = new Queue<AuthAuditJobData>(AUTH_AUDIT_QUEUE_NAME, { connection });
  authAuditWorker = new Worker<AuthAuditJobData>(AUTH_AUDIT_QUEUE_NAME, processAuthAuditJob, { connection });

  return {
    initialized: true,
    queues: [AUTH_AUDIT_QUEUE_NAME]
  };
}

export function getAuthAuditQueue(): Queue<AuthAuditJobData> {
  if (!authAuditQueue) {
    throw new Error("Queue not initialized: auth-audit");
  }
  return authAuditQueue;
}

export async function enqueueAuthAudit(name: string, payload: AuthAuditJobData): Promise<void> {
  if (!authAuditQueue) {
    return;
  }
  await authAuditQueue.add(name, payload);
}

export async function closeQueues(): Promise<void> {
  await authAuditWorker?.close();
  await authAuditQueue?.close();
  authAuditWorker = null;
  authAuditQueue = null;
}
