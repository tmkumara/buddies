import "dotenv/config";
import { PrismaClient, UserRole } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined in .env");
}

const adapter = new PrismaMariaDb(connectionString);

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log("Starting database seed...");

  const passwordHash = await bcrypt.hash("admin123", 10);

  await prisma.user.upsert({
    where: {
      username: "admin",
    },
    update: {
      passwordHash,
      role: UserRole.ADMIN,
      active: true,
      mustChangePassword: false,
    },
    create: {
      username: "admin",
      passwordHash,
      role: UserRole.ADMIN,
      active: true,
      mustChangePassword: false,
    },
  });

  console.log("Admin user seeded: admin / admin123");

  const designTypes = [
    {
      code: "STD",
      name: "Standard Box",
      description: "Regular gift box design category",
      imageUrl: null,
      active: true,
    },
    {
      code: "PRM",
      name: "Premium Box",
      description: "Premium gift box design category",
      imageUrl: null,
      active: true,
    },
    {
      code: "CUS",
      name: "Custom Box",
      description: "Custom customer-specific gift box designs",
      imageUrl: null,
      active: true,
    },
  ];

  for (const designType of designTypes) {
    await prisma.designType.upsert({
      where: {
        code: designType.code,
      },
      update: designType,
      create: designType,
    });
  }

  console.log("Design types seeded.");

  const materials = [
    {
      code: "ART-250",
      name: "Art Board 250 GSM",
      gsm: 250,
      sheetLengthCm: "100.00",
      sheetWidthCm: "70.00",
      costPerSheet: "180.00",
      minStockLevel: "10.00",
      active: true,
    },
    {
      code: "ART-300",
      name: "Art Board 300 GSM",
      gsm: 300,
      sheetLengthCm: "100.00",
      sheetWidthCm: "70.00",
      costPerSheet: "220.00",
      minStockLevel: "10.00",
      active: true,
    },
    {
      code: "KRAFT-250",
      name: "Kraft Board 250 GSM",
      gsm: 250,
      sheetLengthCm: "100.00",
      sheetWidthCm: "70.00",
      costPerSheet: "160.00",
      minStockLevel: "10.00",
      active: true,
    },
  ];

  for (const material of materials) {
    await prisma.material.upsert({
      where: {
        code: material.code,
      },
      update: material,
      create: material,
    });
  }

  console.log("Materials seeded.");
  console.log("Seed completed successfully.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });