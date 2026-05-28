import PDFDocument from "pdfkit";

import { getSignedPayslipDownloadUrl, uploadPayslipPdf } from "../../../utils/cloudinary.util.js";
import type { SessionUser } from "../../auth/interfaces/auth.types.js";
import { getEnvConfig } from "../../../utils/env.config.js";
import { getPrismaClient } from "../../../utils/prisma.connection.js";
import type { EmployeeRecord } from "../interfaces/employee.types.js";

export interface PayslipRecord {
  id: string;
  employeeId: string;
  periodLabel: string;
  periodMonth: number;
  periodYear: number;
  cloudinaryPublicId: string;
  cloudinaryUrl: string;
  fileName: string;
  createdAt: string;
}

export class PayslipService {
  private get useMemoryStore(): boolean {
    return process.env.VITEST === "true" || getEnvConfig().nodeEnv === "test";
  }
  private readonly memoryPayslips = new Map<string, PayslipRecord>();

  private buildPeriod(date: Date): { periodLabel: string; periodMonth: number; periodYear: number } {
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const periodMonth = date.getMonth() + 1;
    const periodYear = date.getFullYear();
    return {
      periodLabel: `${monthNames[date.getMonth()]} ${periodYear}`,
      periodMonth,
      periodYear
    };
  }

  private async renderPayslipPdf(employee: EmployeeRecord, periodLabel: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc.fontSize(20).text("PayrollPilot — Salary Slip", { align: "center" });
      doc.moveDown();
      doc.fontSize(12).text(`Period: ${periodLabel}`);
      doc.text(`Employee: ${employee.fullName}`);
      doc.text(`Code: ${employee.employeeCode}`);
      doc.text(`Department: ${employee.department}`);
      doc.text(`Job title: ${employee.jobTitle}`);
      doc.moveDown();
      doc.fontSize(14).text(`Net salary: ${employee.salary.toLocaleString()} ${employee.currency}`, { underline: true });
      doc.moveDown(2);
      doc.fontSize(10).fillColor("#64748b").text("This is a system-generated payslip for employee self-service.", {
        align: "center"
      });
      doc.end();
    });
  }

  public async createInitialPayslip(employee: EmployeeRecord): Promise<PayslipRecord | null> {
    const period = this.buildPeriod(new Date());
    const fileName = `payslip-${employee.employeeCode}-${period.periodYear}-${String(period.periodMonth).padStart(2, "0")}.pdf`;
    const publicId = `payslip-${employee.employeeCode}-${period.periodYear}-${period.periodMonth}`;

    if (this.useMemoryStore) {
      const record: PayslipRecord = {
        id: `mem-${employee.id}-${period.periodMonth}`,
        employeeId: employee.id,
        periodLabel: period.periodLabel,
        periodMonth: period.periodMonth,
        periodYear: period.periodYear,
        cloudinaryPublicId: publicId,
        cloudinaryUrl: `https://example.com/${fileName}`,
        fileName,
        createdAt: new Date().toISOString()
      };
      this.memoryPayslips.set(record.id, record);
      return record;
    }

    const pdfBuffer = await this.renderPayslipPdf(employee, period.periodLabel);
    const uploaded = await uploadPayslipPdf(pdfBuffer, publicId);
    if (!uploaded) {
      return null;
    }

    const prisma = getPrismaClient();
    const created = await prisma.payslip.upsert({
      where: {
        employeeId_periodYear_periodMonth: {
          employeeId: employee.id,
          periodYear: period.periodYear,
          periodMonth: period.periodMonth
        }
      },
      create: {
        employeeId: employee.id,
        periodLabel: period.periodLabel,
        periodMonth: period.periodMonth,
        periodYear: period.periodYear,
        cloudinaryPublicId: uploaded.publicId,
        cloudinaryUrl: uploaded.url,
        fileName
      },
      update: {
        cloudinaryPublicId: uploaded.publicId,
        cloudinaryUrl: uploaded.url,
        fileName
      }
    });

    return {
      id: created.id,
      employeeId: created.employeeId,
      periodLabel: created.periodLabel,
      periodMonth: created.periodMonth,
      periodYear: created.periodYear,
      cloudinaryPublicId: created.cloudinaryPublicId,
      cloudinaryUrl: created.cloudinaryUrl,
      fileName: created.fileName,
      createdAt: created.createdAt.toISOString()
    };
  }

  public async listForEmployeeEmail(email: string): Promise<PayslipRecord[]> {
    if (this.useMemoryStore) {
      return Array.from(this.memoryPayslips.values());
    }

    const prisma = getPrismaClient();
    const employee = await prisma.employee.findUnique({ where: { email } });
    if (!employee) {
      return [];
    }

    const rows = await prisma.payslip.findMany({
      where: { employeeId: employee.id },
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }]
    });

    return rows.map((row) => this.mapRow(row));
  }

  public async listForEmployeeId(employeeId: string): Promise<PayslipRecord[]> {
    if (this.useMemoryStore) {
      return Array.from(this.memoryPayslips.values()).filter((row) => row.employeeId === employeeId);
    }

    const prisma = getPrismaClient();
    const rows = await prisma.payslip.findMany({
      where: { employeeId },
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }]
    });
    return rows.map((row) => this.mapRow(row));
  }

  public async getDownloadUrl(
    payslipId: string,
    sessionUser: SessionUser
  ): Promise<{ url: string; fileName: string }> {
    const payslip = await this.getById(payslipId);
    if (!payslip) {
      throw new Error("PAYSLIP_NOT_FOUND");
    }

    if (sessionUser.role === "employee") {
      const owned = await this.listForEmployeeEmail(sessionUser.email);
      if (!owned.some((row) => row.id === payslipId)) {
        throw new Error("FORBIDDEN");
      }
    } else if (sessionUser.role !== "hr_manager" && sessionUser.role !== "admin") {
      throw new Error("FORBIDDEN");
    }

    if (this.useMemoryStore) {
      return { url: payslip.cloudinaryUrl, fileName: payslip.fileName };
    }

    try {
      const url = getSignedPayslipDownloadUrl(payslip.cloudinaryPublicId, payslip.fileName);
      return { url, fileName: payslip.fileName };
    } catch {
      return { url: payslip.cloudinaryUrl, fileName: payslip.fileName };
    }
  }

  private async getById(id: string): Promise<PayslipRecord | null> {
    if (this.useMemoryStore) {
      return this.memoryPayslips.get(id) ?? null;
    }

    const row = await getPrismaClient().payslip.findUnique({ where: { id } });
    return row ? this.mapRow(row) : null;
  }

  private mapRow(row: {
    id: string;
    employeeId: string;
    periodLabel: string;
    periodMonth: number;
    periodYear: number;
    cloudinaryPublicId: string;
    cloudinaryUrl: string;
    fileName: string;
    createdAt: Date;
  }): PayslipRecord {
    return {
      id: row.id,
      employeeId: row.employeeId,
      periodLabel: row.periodLabel,
      periodMonth: row.periodMonth,
      periodYear: row.periodYear,
      cloudinaryPublicId: row.cloudinaryPublicId,
      cloudinaryUrl: row.cloudinaryUrl,
      fileName: row.fileName,
      createdAt: row.createdAt.toISOString()
    };
  }
}
