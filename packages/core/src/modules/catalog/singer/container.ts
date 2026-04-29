import { prisma } from "@cvsa/db";
import { SingerRepository } from "./repository";
import { SingerService } from "./service";

export const singerRepository = new SingerRepository(prisma);
export const singerService = new SingerService(singerRepository);
