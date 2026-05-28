import { randomUUID } from "node:crypto";

import { getEnvConfig } from "../../../utils/env.config.js";
import { getPrismaClient } from "../../../utils/prisma.connection.js";
import type { EmployeeListFilters, EmployeeListPage, EmployeeRecord } from "../interfaces/employee.types.js";
import type { CreateEmployeeInput, UpdateEmployeeInput } from "../schema/employee.schema.js";

export class EmployeeService {
  private readonly employees = new Map<string, EmployeeRecord>();
  private readonly useMemoryStore = getEnvConfig().nodeEnv === "test";

  private normalize(value: string): string {
    return value.trim().toLowerCase();
  }

  private mapEmployeeRecord(raw: {
    id: string;
    fullName: string;
    email: string;
    employeeCode: string;
    jobTitle: string;
    department: string;
    country: string;
    salary: number | { toNumber(): number };
    currency: string;
    dateOfJoining: Date | string;
    employmentType: string;
    status: string;
    managerName: string | null;
    isActive: boolean;
    createdAt: Date | string;
    updatedAt: Date | string;
  }): EmployeeRecord {
    return {
      id: raw.id,
      fullName: raw.fullName,
      email: raw.email,
      employeeCode: raw.employeeCode,
      jobTitle: raw.jobTitle,
      department: raw.department,
      country: raw.country,
      salary: typeof raw.salary === "number" ? raw.salary : raw.salary.toNumber(),
      currency: raw.currency,
      dateOfJoining: (raw.dateOfJoining instanceof Date ? raw.dateOfJoining : new Date(raw.dateOfJoining)).toISOString(),
      employmentType: raw.employmentType,
      status: raw.status,
      managerName: raw.managerName ?? undefined,
      isActive: raw.isActive,
      createdAt: (raw.createdAt instanceof Date ? raw.createdAt : new Date(raw.createdAt)).toISOString(),
      updatedAt: (raw.updatedAt instanceof Date ? raw.updatedAt : new Date(raw.updatedAt)).toISOString()
    };
  }

  private generateEmployeeCode(): string {
    return `EMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }

  public async create(input: CreateEmployeeInput): Promise<EmployeeRecord> {
    const now = new Date().toISOString();
    const employee: EmployeeRecord = {
      id: randomUUID(),
      fullName: input.fullName,
      email: input.email,
      employeeCode: this.generateEmployeeCode(),
      jobTitle: input.jobTitle,
      department: input.department,
      country: input.country,
      salary: input.salary,
      currency: input.currency,
      dateOfJoining: new Date(input.dateOfJoining).toISOString(),
      employmentType: input.employmentType ?? "full_time",
      status: input.status ?? "active",
      managerName: input.managerName,
      isActive: true,
      createdAt: now,
      updatedAt: now
    };

    if (this.useMemoryStore) {
      this.employees.set(employee.id, employee);
      return employee;
    }

    const created = await getPrismaClient().employee.create({
      data: {
        fullName: employee.fullName,
        email: employee.email,
        employeeCode: employee.employeeCode,
        jobTitle: employee.jobTitle,
        department: employee.department,
        country: employee.country,
        salary: employee.salary,
        currency: employee.currency,
        dateOfJoining: new Date(employee.dateOfJoining),
        employmentType: employee.employmentType,
        status: employee.status,
        managerName: employee.managerName,
        isActive: employee.isActive
      }
    });
    return this.mapEmployeeRecord(created as never);
  }

  public async list(): Promise<EmployeeRecord[]> {
    if (this.useMemoryStore) {
      return Array.from(this.employees.values());
    }
    const rows = await getPrismaClient().employee.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map((row) => this.mapEmployeeRecord(row as never));
  }

  public async listPage(filters: EmployeeListFilters = {}): Promise<EmployeeListPage> {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 10));
    const search = filters.search?.trim();
    const department = filters.department?.trim();
    const status = filters.status?.trim();

    if (this.useMemoryStore) {
      let rows = Array.from(this.employees.values());
      if (search) {
        const normalizedSearch = this.normalize(search);
        rows = rows.filter((row) => {
          return this.normalize(row.fullName).includes(normalizedSearch)
            || this.normalize(row.employeeCode).includes(normalizedSearch)
            || this.normalize(row.jobTitle).includes(normalizedSearch)
            || this.normalize(row.country).includes(normalizedSearch);
        });
      }
      if (department) {
        const normalizedDepartment = this.normalize(department);
        rows = rows.filter((row) => this.normalize(row.department) === normalizedDepartment);
      }
      if (status) {
        const normalizedStatus = this.normalize(status);
        rows = rows.filter((row) => this.normalize(row.status) === normalizedStatus);
      }
      const totalCount = rows.length;
      const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
      const safePage = Math.min(page, totalPages);
      const start = (safePage - 1) * pageSize;
      const items = rows.slice(start, start + pageSize);
      return { items, totalCount, page: safePage, pageSize, totalPages };
    }

    const where = {
      ...(search ? {
        OR: [
          { fullName: { contains: search, mode: "insensitive" as const } },
          { employeeCode: { contains: search, mode: "insensitive" as const } },
          { jobTitle: { contains: search, mode: "insensitive" as const } },
          { country: { contains: search, mode: "insensitive" as const } }
        ]
      } : {}),
      ...(department ? { department: { equals: department, mode: "insensitive" as const } } : {}),
      ...(status ? { status: { equals: status, mode: "insensitive" as const } } : {})
    };
    const prisma = getPrismaClient();
    const totalCount = await prisma.employee.count({ where });
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const safePage = Math.min(page, totalPages);
    const skip = (safePage - 1) * pageSize;
    const rows = await prisma.employee.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize
    });
    return {
      items: rows.map((row) => this.mapEmployeeRecord(row as never)),
      totalCount,
      page: safePage,
      pageSize,
      totalPages
    };
  }

  public async getById(id: string): Promise<EmployeeRecord | null> {
    if (this.useMemoryStore) {
      return this.employees.get(id) ?? null;
    }
    const row = await getPrismaClient().employee.findUnique({ where: { id } });
    return row ? this.mapEmployeeRecord(row as never) : null;
  }

  public async update(input: UpdateEmployeeInput): Promise<EmployeeRecord> {
    if (this.useMemoryStore) {
      const existing = this.employees.get(input.id);
      if (!existing) {
        throw new Error("EMPLOYEE_NOT_FOUND");
      }

      const updated: EmployeeRecord = {
        ...existing,
        ...input,
        dateOfJoining: input.dateOfJoining ? new Date(input.dateOfJoining).toISOString() : existing.dateOfJoining,
        updatedAt: new Date().toISOString()
      };
      this.employees.set(updated.id, updated);
      return updated;
    }

    try {
      const updated = await getPrismaClient().employee.update({
        where: { id: input.id },
        data: {
          fullName: input.fullName,
          email: input.email,
          jobTitle: input.jobTitle,
          department: input.department,
          country: input.country,
          salary: input.salary,
          currency: input.currency,
          dateOfJoining: input.dateOfJoining ? new Date(input.dateOfJoining) : undefined,
          employmentType: input.employmentType,
          status: input.status,
          managerName: input.managerName,
          isActive: input.isActive
        }
      });
      return this.mapEmployeeRecord(updated as never);
    } catch {
      throw new Error("EMPLOYEE_NOT_FOUND");
    }
  }

  public async remove(id: string): Promise<boolean> {
    if (this.useMemoryStore) {
      return this.employees.delete(id);
    }
    try {
      await getPrismaClient().employee.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  public async getSalaryInsightsByCountry(country: string): Promise<{
    country: string;
    minimumSalary: number;
    maximumSalary: number;
    averageSalary: number;
    employeeCount: number;
  }> {
    const normalizedCountry = this.normalize(country);
    const rows = (await this.list()).filter((employee) => this.normalize(employee.country) === normalizedCountry);
    if (rows.length === 0) {
      throw new Error("EMPLOYEE_NOT_FOUND");
    }

    const salaries = rows.map((row) => row.salary);
    const total = salaries.reduce((acc, value) => acc + value, 0);

    return {
      country,
      minimumSalary: Math.min(...salaries),
      maximumSalary: Math.max(...salaries),
      averageSalary: Number((total / rows.length).toFixed(2)),
      employeeCount: rows.length
    };
  }

  public async getJobTitleSalaryInsights(country: string, jobTitle: string): Promise<{
    country: string;
    jobTitle: string;
    averageSalary: number;
    employeeCount: number;
  }> {
    const normalizedCountry = this.normalize(country);
    const normalizedJobTitle = this.normalize(jobTitle);
    const rows = (await this.list()).filter(
      (employee) =>
        this.normalize(employee.country) === normalizedCountry
        && this.normalize(employee.jobTitle) === normalizedJobTitle
    );
    if (rows.length === 0) {
      throw new Error("EMPLOYEE_NOT_FOUND");
    }

    const total = rows.reduce((acc, row) => acc + row.salary, 0);

    return {
      country,
      jobTitle,
      averageSalary: Number((total / rows.length).toFixed(2)),
      employeeCount: rows.length
    };
  }
}
