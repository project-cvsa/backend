import { prisma } from "@project-cvsa/core/common";
import type { SongDetailsDto, SongId, ListSongsQueryDto, ListSongsResponseDto } from "./dto";
import type { CreateSongDto, UpdateSongDto } from "./dto";
import { SongRepository } from "./repository";
import { AppError } from "@project-cvsa/core";
import type { Song } from "@project-cvsa/db";

export class SongService {
	constructor(private readonly repository: SongRepository = new SongRepository(prisma)) {}

	async getDetails(id: SongId): Promise<SongDetailsDto> {
		const result = await this.repository.getDetailsById(id);
		if (result === null) {
			throw new AppError("Song not found", "NOT_FOUND", 404);
		}
		return result;
	}

	async create(input: CreateSongDto): Promise<Song> {
		return this.repository.createWithRelations(input);
	}

	async update(id: SongId, input: UpdateSongDto): Promise<Song> {
		const existing = await this.repository.getById(id);
		if (existing === null) {
			throw new AppError("Song not found", "NOT_FOUND", 404);
		}
		return this.repository.updateWithRelations(id, input);
	}

	async delete(id: SongId): Promise<void> {
		const existing = await this.repository.getById(id);
		if (existing === null) {
			throw new AppError("Song not found", "NOT_FOUND", 404);
		}
		await this.repository.softDelete(id);
	}

	async list(query: ListSongsQueryDto = {}): Promise<ListSongsResponseDto> {
		const { offset = 0, limit = 50 } = query;
		const result = await this.repository.list(query);
		return {
			songs: result.songs,
			total: result.total,
			offset,
			limit,
		};
	}
}
