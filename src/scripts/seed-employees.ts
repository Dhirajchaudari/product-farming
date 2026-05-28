import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

import "dotenv/config";
import { Pool } from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../..");

const TARGET_COUNT = Number(process.env.SEED_EMPLOYEE_COUNT ?? "10000");
const BATCH_SIZE = Number(process.env.SEED_BATCH_SIZE ?? "1000");

const JOB_TITLES = ["Software Engineer", "HR Manager", "Product Manager", "Designer", "QA Engineer", "Data Analyst"];
const DEPARTMENTS = ["Engineering", "People Operations", "Product", "Design", "Quality", "Data"];
const COUNTRIES = ["India", "USA", "Germany", "Canada", "UK", "Singapore"];
const CURRENCIES = ["INR", "USD", "EUR", "CAD", "GBP", "SGD"];

function randomFrom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)] as T;
}

async function readNameFile(filePath: string): Promise<string[]> {
  const content = await readFile(filePath, "utf8");
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function makeEmployeeCode(index: number): string {
  return `EMP-${String(index + 1).padStart(6, "0")}`;
}

function makeEmail(fullName: string, index: number): string {
  const handle = fullName.toLowerCase().replace(/\s+/g, ".");
  return `${handle}.${index + 1}@product-farming.test`;
}

function makeDateOfJoining(index: number): Date {
  const start = new Date("2018-01-01T00:00:00.000Z").getTime();
  const end = new Date("2026-01-01T00:00:00.000Z").getTime();
  const span = end - start;
  return new Date(start + (index * 9301) % span);
}

async function main(): Promise<void> {
  const firstNamesPath = path.join(ROOT_DIR, "seed-data", "first_names.txt");
  const lastNamesPath = path.join(ROOT_DIR, "seed-data", "last_names.txt");

  const [firstNames, lastNames] = await Promise.all([
    readNameFile(firstNamesPath),
    readNameFile(lastNamesPath)
  ]);

  if (firstNames.length === 0 || lastNames.length === 0) {
    throw new Error("Name seed files are empty. Please add entries to seed-data/*.txt");
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for seeding");
  }
  const pool = new Pool({ connectionString: databaseUrl });
  const rows = Array.from({ length: TARGET_COUNT }, (_, index) => {
    const firstName = randomFrom(firstNames);
    const lastName = randomFrom(lastNames);
    const fullName = `${firstName} ${lastName}`;
    const country = randomFrom(COUNTRIES);
    const salaryBase = 35000 + (index % 120) * 2500;
    const jobTitle = randomFrom(JOB_TITLES);

    return {
      id: randomUUID(),
      fullName,
      email: makeEmail(fullName, index),
      employeeCode: makeEmployeeCode(index),
      jobTitle,
      department: randomFrom(DEPARTMENTS),
      country,
      salary: salaryBase,
      currency: CURRENCIES[COUNTRIES.indexOf(country)] ?? "USD",
      dateOfJoining: makeDateOfJoining(index),
      employmentType: index % 8 === 0 ? "contract" : "full_time",
      status: index % 20 === 0 ? "on_leave" : "active",
      managerName: index % 5 === 0 ? `${randomFrom(firstNames)} ${randomFrom(lastNames)}` : null,
      isActive: index % 30 !== 0,
      updatedAt: new Date()
    };
  });

  const startedAt = Date.now();
  const client = await pool.connect();
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE);
    const values: unknown[] = [];
    const tuples = chunk.map((row, rowIndex) => {
      const offset = rowIndex * 15;
      values.push(
        row.id,
        row.fullName,
        row.email,
        row.employeeCode,
        row.jobTitle,
        row.department,
        row.country,
        row.salary,
        row.currency,
        row.dateOfJoining,
        row.employmentType,
        row.status,
        row.managerName,
        row.isActive,
        row.updatedAt
      );
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15})`;
    });
    await client.query(
      `INSERT INTO "Employee" ("id", "fullName", "email", "employeeCode", "jobTitle", "department", "country", "salary", "currency", "dateOfJoining", "employmentType", "status", "managerName", "isActive", "updatedAt")
       VALUES ${tuples.join(", ")}
       ON CONFLICT ("email") DO NOTHING`,
      values
    );
    const inserted = Math.min(i + BATCH_SIZE, rows.length);
    console.info(`[seed] processed ${inserted}/${rows.length}`);
  }
  client.release();
  await pool.end();
  const elapsedMs = Date.now() - startedAt;
  console.info(`[seed] done count=${rows.length} elapsed_ms=${elapsedMs}`);
}

main().catch((error) => {
  console.error("[seed] failed", error);
  process.exit(1);
});
