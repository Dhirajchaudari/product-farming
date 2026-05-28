import { randomUUID } from "node:crypto";

import type { EmployeeRecord } from "../interfaces/employee.types.js";
import type { CreateEmployeeInput, UpdateEmployeeInput } from "../schema/employee.schema.js";

export class EmployeeService {
  private readonly employees = new Map<string, EmployeeRecord>();

  private normalize(value: string): string {
    return value.trim().toLowerCase();
  }

  public create(input: CreateEmployeeInput): EmployeeRecord {
    const now = new Date().toISOString();
    const employee: EmployeeRecord = {
      id: randomUUID(),
      fullName: input.fullName,
      jobTitle: input.jobTitle,
      country: input.country,
      salary: input.salary,
      currency: input.currency,
      isActive: true,
      createdAt: now,
      updatedAt: now
    };
    this.employees.set(employee.id, employee);
    return employee;
  }

  public list(): EmployeeRecord[] {
    return Array.from(this.employees.values());
  }

  public getById(id: string): EmployeeRecord | null {
    return this.employees.get(id) ?? null;
  }

  public update(input: UpdateEmployeeInput): EmployeeRecord {
    const existing = this.employees.get(input.id);
    if (!existing) {
      throw new Error("EMPLOYEE_NOT_FOUND");
    }

    const updated: EmployeeRecord = {
      ...existing,
      ...input,
      updatedAt: new Date().toISOString()
    };
    this.employees.set(updated.id, updated);
    return updated;
  }

  public remove(id: string): boolean {
    return this.employees.delete(id);
  }

  public getSalaryInsightsByCountry(country: string): {
    country: string;
    minimumSalary: number;
    maximumSalary: number;
    averageSalary: number;
    employeeCount: number;
  } {
    const normalizedCountry = this.normalize(country);
    const rows = this.list().filter((employee) => this.normalize(employee.country) === normalizedCountry);
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

  public getJobTitleSalaryInsights(country: string, jobTitle: string): {
    country: string;
    jobTitle: string;
    averageSalary: number;
    employeeCount: number;
  } {
    const normalizedCountry = this.normalize(country);
    const normalizedJobTitle = this.normalize(jobTitle);
    const rows = this.list().filter(
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
