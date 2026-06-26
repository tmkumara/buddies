import prisma from "../src/lib/prisma";

const sources = ["WhatsApp", "Facebook", "Instagram", "Walk-in", "Referral", "Other"];

async function main() {
  for (const name of sources) {
    const existing = await prisma.leadSource.findFirst({ where: { name } });
    if (!existing) {
      await prisma.leadSource.create({ data: { name } });
    }
  }
  console.log("Lead sources seeded.");
}

main().finally(() => prisma.$disconnect());
