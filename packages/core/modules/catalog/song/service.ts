import { prisma } from "@project-cvsa/core/common";
import type { SongDetailsDto, SongId } from "./dto";
import { SongRepository } from "./repository";
import { AppError } from "@project-cvsa/core";

export class SongService {
	constructor(private readonly repository: SongRepository = new SongRepository(prisma)) {}

	async getDetails(id: SongId): Promise<SongDetailsDto> {
		const result = await this.repository.getDetailsById(id);
		if (result === null) {
			throw new AppError("Song not found", "NOT_FOUND", 404);
		}
		return result;
	}
}
