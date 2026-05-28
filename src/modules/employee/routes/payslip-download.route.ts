import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { AUTH_SESSION_COOKIE } from "../../auth/auth.constants.js";
import { resolveSessionUserFromCookie } from "../../auth/resolvers/auth.resolver.js";
import { PayslipService } from "../services/payslip.service.js";
import { fetchPayslipPdfBuffer } from "../../../utils/cloudinary.util.js";

const payslipService = new PayslipService();

interface PayslipParams {
  payslipId: string;
}

export async function registerPayslipDownloadRoute(app: FastifyInstance): Promise<void> {
  app.get(
    "/payslips/:payslipId/download",
    async (request: FastifyRequest<{ Params: PayslipParams }>, reply: FastifyReply) => {
      const sessionId = request.cookies[AUTH_SESSION_COOKIE];
      const sessionUser = await resolveSessionUserFromCookie(sessionId);

      if (!sessionUser) {
        return reply.code(401).send({ error: "UNAUTHENTICATED" });
      }

      try {
        const payslip = await payslipService.getAuthorizedPayslipForDownload(
          request.params.payslipId,
          sessionUser
        );
        const buffer = await fetchPayslipPdfBuffer(payslip.cloudinaryPublicId, payslip.fileName);

        return reply
          .header("Content-Type", "application/pdf")
          .header("Content-Disposition", `attachment; filename="${payslip.fileName}"`)
          .header("Cache-Control", "private, no-store")
          .send(buffer);
      } catch (error) {
        const message = error instanceof Error ? error.message : "PAYSLIP_DOWNLOAD_FAILED";
        request.log.error({ err: error, payslipId: request.params.payslipId }, "Payslip download failed");

        if (message === "PAYSLIP_NOT_FOUND") {
          return reply.code(404).send({ error: message });
        }
        if (message === "FORBIDDEN") {
          return reply.code(403).send({ error: message });
        }
        return reply.code(502).send({ error: "PAYSLIP_DOWNLOAD_FAILED" });
      }
    }
  );
}
