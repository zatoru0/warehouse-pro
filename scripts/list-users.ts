import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
dotenv.config();

const adapter = new PrismaPg(process.env.DIRECT_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = await prisma.user.findMany({
    select: { email: true, full_name: true, role: true, departments: true, is_active: true },
    orderBy: { created_at: "asc" },
  });
  console.log(`Found ${users.length} users:\n`);
  for (const u of users) {
    const depts = u.departments.length ? u.departments.join(", ") : "(ยังไม่มีฝ่าย)";
    console.log(`  ${u.is_active ? "✓" : "✗"} ${u.email}`);
    console.log(`      role: ${u.role} | depts: ${depts}`);
  }
}

main().finally(() => prisma.$disconnect());
