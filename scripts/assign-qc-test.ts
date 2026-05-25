import { PrismaClient, Department } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
dotenv.config();

const adapter = new PrismaPg(process.env.DIRECT_URL!);
const prisma = new PrismaClient({ adapter });

const TARGET_EMAIL = "test1@warehouse.com";

async function main() {
  const user = await prisma.user.findUnique({ where: { email: TARGET_EMAIL } });
  if (!user) {
    console.log(`✗ ไม่พบ user ${TARGET_EMAIL}`);
    return;
  }

  const next = Array.from(new Set([...user.departments, Department.QC]));
  await prisma.user.update({ where: { id: user.id }, data: { departments: next } });

  console.log(`✓ ${TARGET_EMAIL} departments: ${next.join(", ")}`);
}

main().finally(() => prisma.$disconnect());
