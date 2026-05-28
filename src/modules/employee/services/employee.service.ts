import { randomUUID } from "node:crypto";

import type { EmployeeRecord } from "../interfaces/employee.types.js";
import type { CreateEmployeeInput, UpdateEmployeeInput } from "../schema/employee.schema.js";

export class EmployeeService {
  private readonly employees = new Map<string, EmployeeRecord>();

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
}
