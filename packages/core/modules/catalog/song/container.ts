import { prisma } from "@cvsa/core/common";
import { SongRepository } from "./repository";
import { SongService } from "./service";
import { SongSearchService, searchManager, embeddingManager } from "@cvsa/core/modules";

export const songRepository = new SongRepository(prisma);
export const songSearchService = new SongSearchService(
	songRepository,
	searchManager,
	embeddingManager
);
export const songService = new SongService(songRepository, songSearchService);
