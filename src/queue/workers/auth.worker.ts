import type { Job } from "bullmq";

export interface AuthAuditJobData {
  event: "login" | "logout";
  userId: string;
  email: string;
  at: string;
}

export async function processAuthAuditJob(job: Job<AuthAuditJobData>): Promise<void> {
  const payload = job.data;
  // Placeholder worker behavior for now; replace with persistent audit storage later.
  console.info(`[auth-audit-worker] ${payload.event} user=${payload.userId} email=${payload.email} at=${payload.at}`);
}
