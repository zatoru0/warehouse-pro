import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
dotenv.config();

const adapter = new PrismaPg(process.env.DIRECT_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = await prisma.user.findMany({ orderBy: { created_at: "asc" } });
  console.log(`Found ${users.length} users:`);
  for (const u of users) {
    console.log(`  - ${u.email} (${u.role})`);
  }
  if (users.length > 0) {
    const first = users[0];
    await prisma.user.update({
      where: { id: first.id },
      data: { role: "SUPERADMIN" },
    });
    console.log(`\n✓ Promoted ${first.email} to SUPERADMIN`);
  }
}

main().finally(() => prisma.$disconnect());
