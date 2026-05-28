import { hash } from "bcryptjs";

import "dotenv/config";
import { getPrismaClient } from "../utils/prisma.connection.js";

async function main(): Promise<void> {
  const email = process.env.DEFAULT_HR_EMAIL ?? process.env.SEED_HR_EMAIL ?? "hr@product-farming.test";
  const password = process.env.SEED_HR_PASSWORD ?? "PayrollPilot@123";
  const passwordHash = await hash(password, 10);
  const prisma = getPrismaClient();

  await prisma.authUser.upsert({
    where: { email },
    create: {
      email,
      role: "hr_manager",
      passwordHash,
      isEmailVerified: true,
      firstLogin: false
    },
    update: {
      role: "hr_manager",
      passwordHash,
      isEmailVerified: true
    }
  });

  console.info(`[seed-hr] HR user ready`);
  console.info(`[seed-hr] email=${email}`);
  console.info(`[seed-hr] password=${password}`);
}

main()
  .catch((error) => {
    console.error("[seed-hr] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const prisma = getPrismaClient();
    await prisma.$disconnect();
  });
