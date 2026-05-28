import { Queue, Worker } from "bullmq";

import { getEnvConfig } from "../utils/env.config.js";
import { processAuthAuditJob, type AuthAuditJobData } from "./workers/auth.worker.js";
import {
  processCommunicationEmail,
  sendCommunicationEmailWorker,
  type CommunicationEmailJobData
} from "./workers/send-communication-email.worker.js";

const AUTH_AUDIT_QUEUE_NAME = "auth-audit";
const COMMUNICATION_EMAIL_QUEUE_NAME = "communication-email";

export interface QueueBootstrapResult {
  initialized: boolean;
  queues: string[];
  error?: string;
}

let authAuditQueue: Queue<AuthAuditJobData> | null = null;
let authAuditWorker: Worker<AuthAuditJobData> | null = null;
let communicationEmailQueue: Queue<CommunicationEmailJobData> | null = null;
let communicationEmailWorker: Worker<CommunicationEmailJobData> | null = null;

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
      queues: [AUTH_AUDIT_QUEUE_NAME, COMMUNICATION_EMAIL_QUEUE_NAME]
    };
  }

  try {
    const connection = getBullConnection();
    authAuditQueue = new Queue<AuthAuditJobData>(AUTH_AUDIT_QUEUE_NAME, { connection });
    authAuditWorker = new Worker<AuthAuditJobData>(AUTH_AUDIT_QUEUE_NAME, processAuthAuditJob, { connection });
    communicationEmailQueue = new Queue<CommunicationEmailJobData>(COMMUNICATION_EMAIL_QUEUE_NAME, { connection });
    communicationEmailWorker = new Worker<CommunicationEmailJobData>(
      COMMUNICATION_EMAIL_QUEUE_NAME,
      sendCommunicationEmailWorker,
      { connection }
    );

    authAuditWorker.on("error", (error) => {
      console.error("[auth-audit-worker] error", error);
    });
    communicationEmailWorker.on("error", (error) => {
      console.error("[communication-email-worker] error", error);
    });
    communicationEmailWorker.on("active", (job) => {
      console.info(`[communication-email-worker] job active id=${job.id}`);
    });
    communicationEmailWorker.on("completed", (job) => {
      console.info(`[communication-email-worker] job completed id=${job.id}`);
    });
    communicationEmailWorker.on("failed", (job, error) => {
      console.error(`[communication-email-worker] job failed id=${job?.id}`, error);
    });

    return {
      initialized: true,
      queues: [AUTH_AUDIT_QUEUE_NAME, COMMUNICATION_EMAIL_QUEUE_NAME]
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown queue bootstrap error";
    console.error("[queue] bootstrap failed", error);
    authAuditQueue = null;
    authAuditWorker = null;
    return {
      initialized: false,
      queues: [],
      error: message
    };
  }
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

export async function enqueueCommunicationEmail(
  name: string,
  payload: CommunicationEmailJobData
): Promise<void> {
  if (!communicationEmailQueue) {
    console.warn("[email] queue unavailable, sending email directly");
    try {
      await processCommunicationEmail(payload);
    } catch (error) {
      console.error("[email] direct send failed", error);
    }
    return;
  }
  await communicationEmailQueue.add(name, payload, {
    delay: 500,
    removeOnComplete: true,
    removeOnFail: true
  });
}

export async function closeQueues(): Promise<void> {
  await authAuditWorker?.close();
  await authAuditQueue?.close();
  await communicationEmailWorker?.close();
  await communicationEmailQueue?.close();
  authAuditWorker = null;
  authAuditQueue = null;
  communicationEmailWorker = null;
  communicationEmailQueue = null;
}
