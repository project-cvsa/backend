import { prisma } from "@cvsa/core/common";
import { SongRepository } from "./repository";
import { SongService } from "./service";

export const songRepository = new SongRepository(prisma);
export const songService = new SongService(songRepository);
