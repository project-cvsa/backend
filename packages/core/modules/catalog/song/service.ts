import { AppError, type SongSearchService } from "@cvsa/core";
import type { Song } from "@cvsa/db";
import type {
	SongDetailsResponseDto,
	SongId,
	CreateSongRequestDto,
	UpdateSongRequestDto,
} from "./dto";
import type { ISongRepository } from "./repository.interface";
import type { IDetailsService, Serialized } from "@cvsa/core/common";

export class SongService implements IDetailsService<SongDetailsResponseDto> {
	constructor(
		private readonly repository: ISongRepository,
		private readonly search: SongSearchService
	) {}

	async getDetails(id: SongId) {
		const result = await this.repository.getDetailsById(id);
		if (result === null) {
			throw new AppError("Song not found", "NOT_FOUND", 404);
		}
		return result;
	}

	async create(input: CreateSongRequestDto): Promise<Serialized<Song>> {
		const result = await this.repository.create(input);
		try {
			this.search.sync(result.id);
		} catch (e) {
			console.error(e);
		}
		return result;
	}

	async update(id: SongId, input: UpdateSongRequestDto): Promise<Serialized<Song>> {
		const existing = await this.repository.getById(id);
		if (existing === null) {
			throw new AppError("Song not found", "NOT_FOUND", 404);
		}
		const result = await this.repository.update(id, input);
		try {
			this.search.sync(id);
		} catch (e) {
			console.error(e);
		}
		return result;
	}

	async delete(id: SongId): Promise<void> {
		const existing = await this.repository.getById(id);
		if (existing === null) {
			throw new AppError("Song not found", "NOT_FOUND", 404);
		}
		await this.repository.softDelete(id);
		try {
			this.search.sync(id);
		} catch (e) {
			console.error(e);
		}
	}
}
