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

export async function uploadPayslipPdf(
  buffer: Buffer,
  publicId: string
): Promise<{ publicId: string; url: string } | null> {
  if (!ensureCloudinary()) {
    console.warn("[cloudinary] credentials missing, skipping upload");
    return null;
  }

  const fullPublicId = `${PAYSLIP_FOLDER}/${publicId}`;

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        public_id: fullPublicId,
        format: "pdf",
        overwrite: true,
        access_mode: "public"
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("CLOUDINARY_UPLOAD_FAILED"));
          return;
        }
        const signedUrl = getSignedPayslipDownloadUrl(result.public_id, `${publicId}.pdf`);
        resolve({
          publicId: result.public_id,
          url: signedUrl
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

  return cloudinary.url(publicId, {
    resource_type: "raw",
    type: "upload",
    secure: true,
    sign_url: true,
    flags: "attachment",
    attachment: fileName
  });
}
