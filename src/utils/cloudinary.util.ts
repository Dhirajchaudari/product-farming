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

/** Cloudinary raw PDF public_ids include `.pdf` in the id — do not strip it. */
function normalizePublicId(publicId: string): string {
  return publicId.trim().replace(/^\/+/, "");
}

export async function uploadPayslipPdf(
  buffer: Buffer,
  publicId: string
): Promise<{ publicId: string; url: string } | null> {
  if (!ensureCloudinary()) {
    console.warn("[cloudinary] credentials missing, skipping upload");
    return null;
  }

  const baseId = publicId.replace(/\.pdf$/i, "").replace(/^\/+/, "");

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
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60;

  return cloudinary.utils.private_download_url(id, "pdf", {
    resource_type: "raw",
    type: "upload",
    attachment: true,
    expires_at: expiresAt
  });
}

export async function fetchPayslipPdfBuffer(publicId: string, fileName: string): Promise<Buffer> {
  if (!ensureCloudinary()) {
    throw new Error("CLOUDINARY_NOT_CONFIGURED");
  }

  const id = normalizePublicId(publicId);

  await cloudinary.api.resource(id, { resource_type: "raw" });

  const downloadUrl = getSignedPayslipDownloadUrl(id, fileName);
  const response = await fetch(downloadUrl);

  if (!response.ok) {
    throw new Error(`CLOUDINARY_FETCH_FAILED_${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 100) {
    throw new Error("CLOUDINARY_EMPTY_PDF");
  }

  return buffer;
}
