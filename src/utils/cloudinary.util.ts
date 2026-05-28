import { v2 as cloudinary } from "cloudinary";

import { getEnvConfig } from "./env.config.js";

let configured = false;

function ensureCloudinary(): boolean {
  const env = getEnvConfig();
  if (!env.cloudinaryCloudName || !env.cloudinaryApiKey || !env.cloudinaryApiSecret) {
    return false;
  }
  if (!configured) {
    cloudinary.config({
      cloud_name: env.cloudinaryCloudName,
      api_key: env.cloudinaryApiKey,
      api_secret: env.cloudinaryApiSecret,
      secure: true
    });
    configured = true;
  }
  return true;
}

const PAYSLIP_FOLDER = "payrollpilot/payslips";

function normalizePublicId(publicId: string): string {
  return publicId.replace(/\.pdf$/i, "").replace(/^\/+/, "");
}

export async function uploadPayslipPdf(
  buffer: Buffer,
  publicId: string
): Promise<{ publicId: string; url: string } | null> {
  if (!ensureCloudinary()) {
    console.warn("[cloudinary] credentials missing, skipping upload");
    return null;
  }

  const baseId = normalizePublicId(publicId);

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: PAYSLIP_FOLDER,
        public_id: baseId,
        resource_type: "raw",
        format: "pdf",
        overwrite: true,
        access_mode: "public"
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("CLOUDINARY_UPLOAD_FAILED"));
          return;
        }
        const storedId = result.public_id;
        const fileName = `${baseId.split("/").pop() ?? baseId}.pdf`;
        resolve({
          publicId: storedId,
          url: getSignedPayslipDownloadUrl(storedId, fileName)
        });
      }
    );
    stream.end(buffer);
  });
}

export function getSignedPayslipDownloadUrl(publicId: string, fileName: string): string {
  if (!ensureCloudinary()) {
    throw new Error("CLOUDINARY_NOT_CONFIGURED");
  }

  const id = normalizePublicId(publicId);
  const safeFileName = fileName.replace(/[^\w.\-]+/g, "_");
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60;

  return cloudinary.utils.private_download_url(id, "pdf", {
    resource_type: "raw",
    type: "upload",
    attachment: true,
    expires_at: expiresAt,
    ...(safeFileName ? { filename: safeFileName } : {})
  });
}

export async function fetchPayslipPdfBuffer(publicId: string, fileName: string): Promise<Buffer> {
  const url = getSignedPayslipDownloadUrl(publicId, fileName);
  const response = await fetch(url);

  if (!response.ok) {
    const fallbackUrl = cloudinary.url(normalizePublicId(publicId), {
      resource_type: "raw",
      type: "upload",
      secure: true,
      sign_url: true,
      flags: `attachment:${fileName}`
    });
    const fallbackResponse = await fetch(fallbackUrl);
    if (!fallbackResponse.ok) {
      throw new Error(`CLOUDINARY_FETCH_FAILED_${response.status}`);
    }
    return Buffer.from(await fallbackResponse.arrayBuffer());
  }

  return Buffer.from(await response.arrayBuffer());
}
