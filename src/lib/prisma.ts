import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const make = () =>
  new PrismaClient({ adapter: new PrismaMariaDb(process.env.DATABASE_URL!) });

declare global {
  var _prisma: ReturnType<typeof make> | undefined;
}

const prisma = globalThis._prisma ?? make();
export default prisma;

if (process.env.NODE_ENV !== "production") globalThis._prisma = prisma;
