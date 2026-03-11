import { PrismaClient } from "@project-cvsa/db";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "@project-cvsa/core/common";

const adapter = new PrismaPg({
	connectionString: env.DATABASE_URL,
});

export const prisma = new PrismaClient({ adapter });
