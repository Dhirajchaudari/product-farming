import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import handlebars from "handlebars";
import nodemailer from "nodemailer";

import { getEnvConfig } from "../env.config.js";

interface BaseEmailPayload {
  email: string;
  subject?: string;
  html?: string;
}

let transporter: nodemailer.Transporter | null = null;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function renderTemplate(templateName: string, payload: Record<string, unknown>): string {
  const templatePath = path.join(__dirname, "templates", `${templateName}.hbs`);
  const source = readFileSync(templatePath, "utf8");
  const compiled = handlebars.compile(source);
  return compiled(payload);
}

function getTransporter(): nodemailer.Transporter | null {
  const env = getEnvConfig();
  if (!transporter) {
    if (!env.smtpUser || !env.smtpPassword) {
      return null;
    }
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: env.smtpUser,
        pass: env.smtpPassword
      }
    });
  }

  return transporter;
}

async function sendEmail(payload: BaseEmailPayload): Promise<{ success: boolean; skipped?: boolean; reason?: string }> {
  const env = getEnvConfig();
  const sender = getTransporter();
  if (!sender) {
    console.warn("[email] SMTP not configured, skipping email send");
    return { success: true, skipped: true, reason: "SMTP_NOT_CONFIGURED" };
  }

  const htmlContent = payload.html ?? renderTemplate("user-onboarding", payload as unknown as Record<string, unknown>);

  await sender.sendMail({
    from: env.emailFromAddress ?? env.smtpUser ?? "noreply@productfarming.app",
    to: payload.email,
    subject: payload.subject ?? "Product Farming Notification",
    html: htmlContent,
    text: payload.subject ?? "Product Farming Notification"
  });

  return { success: true };
}

function defaultHtml(title: string, data: unknown): string {
  return `<h2>${title}</h2><pre>${JSON.stringify(data, null, 2)}</pre>`;
}

export async function sendUserOnboardingEmail(data: BaseEmailPayload): Promise<{ success: boolean; skipped?: boolean; reason?: string }> {
  return sendEmail({
    ...data,
    subject: data.subject ?? "Welcome to PayrollPilot HR",
    html: data.html ?? renderTemplate("user-onboarding", data as unknown as Record<string, unknown>)
  });
}

export async function sendEmailVerificationOtp(data: BaseEmailPayload & { otpCode?: string }): Promise<{ success: boolean; skipped?: boolean; reason?: string }> {
  return sendEmail({
    ...data,
    subject: data.subject ?? "Verify your PayrollPilot account",
    html: data.html ?? renderTemplate("email-verification-otp", data as unknown as Record<string, unknown>)
  });
}
