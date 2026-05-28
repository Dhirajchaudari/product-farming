import type { Job } from "bullmq";

import { EmailTemplateType } from "../../utils/constants/emails.constant.js";
import {
  sendEmailVerificationOtp,
  sendEmployeeWelcomeEmail,
  sendUserOnboardingEmail
} from "../../utils/email/index.email.js";

export interface CommunicationEmailJobDataPayload {
  userId?: string;
  email?: string;
  subject?: string;
  html?: string;
  fullName?: string;
  employeeCode?: string;
  jobTitle?: string;
  department?: string;
  setupPasswordUrl?: string;
  otpCode?: string;
  [key: string]: unknown;
}

export interface CommunicationEmailJobData {
  type: EmailTemplateType;
  data: CommunicationEmailJobDataPayload;
}

export async function processCommunicationEmail(
  payload: CommunicationEmailJobData
): Promise<{ success: boolean; skipped?: boolean; reason?: string }> {
  const { type, data } = payload;
  if (!data.email) {
    throw new Error("EMAIL_REQUIRED");
  }

  switch (type) {
    case EmailTemplateType.USER_ONBOARDING:
      return sendUserOnboardingEmail(data as { email: string; subject?: string; html?: string });
    case EmailTemplateType.EMAIL_VERIFICATION_OTP:
      return sendEmailVerificationOtp(data as { email: string; otpCode?: string; subject?: string; html?: string });
    case EmailTemplateType.EMPLOYEE_WELCOME:
      return sendEmployeeWelcomeEmail(data as {
        email: string;
        fullName?: string;
        employeeCode?: string;
        jobTitle?: string;
        department?: string;
        setupPasswordUrl?: string;
        subject?: string;
        html?: string;
      });
    default:
      throw new Error(`Unknown email template type: ${String(type)}`);
  }
}

export async function sendCommunicationEmailWorker(
  job: Job<CommunicationEmailJobData>
): Promise<{ success: boolean; skipped?: boolean; reason?: string }> {
  try {
    return await processCommunicationEmail(job.data);
  } catch (error) {
    console.error("[email-worker] Error while sending email", error);
    throw error;
  }
}
