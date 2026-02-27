import { PrismaClient } from "@prisma/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "@lib/env";

const adapter = new PrismaPg({
    connectionString: env.DATABASE_URL,
});

// const globalForPrisma = global as unknown as { prisma: PrismaClient };

// export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

// if (import.meta.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export const prisma = new PrismaClient({ adapter });
