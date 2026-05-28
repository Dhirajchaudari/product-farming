import type { Job } from "bullmq";

import { EmailTemplateType } from "../../utils/constants/emails.constant.js";
import { sendUserOnboardingEmail } from "../../utils/email/index.email.js";

export interface CommunicationEmailJobDataPayload {
  userId?: string;
  email?: string;
  subject?: string;
  html?: string;
  [key: string]: unknown;
}

export interface CommunicationEmailJobData {
  type: EmailTemplateType;
  data: CommunicationEmailJobDataPayload;
}

export async function sendCommunicationEmailWorker(job: Job<CommunicationEmailJobData>): Promise<{ success: boolean; skipped?: boolean; reason?: string }> {
  try {
    const { type, data } = job.data;
    if (!data.email) {
      throw new Error("EMAIL_REQUIRED");
    }

    switch (type) {
      case EmailTemplateType.USER_ONBOARDING:
        return sendUserOnboardingEmail(data as { email: string; subject?: string; html?: string });
      default:
        throw new Error(`Unknown email template type: ${String(type)}`);
    }
  } catch (error) {
    console.error("[email-worker] Error while sending email", error);
    throw error;
  }
}
