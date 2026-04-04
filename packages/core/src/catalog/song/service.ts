import type { SongSearchService } from "@cvsa/core/internal";
import { AppError, type IServiceWithGetDetails } from "@cvsa/core/internal";
import type { Song, Serialized } from "@cvsa/db";
import type {
	SongDetailsResponseDto,
	SongId,
	CreateSongRequestDto,
	UpdateSongRequestDto,
} from "./dto";
import type { ISongRepository } from "./repository.interface";
import { traceTask } from "@cvsa/observability";

export class SongService implements IServiceWithGetDetails<SongDetailsResponseDto> {
	constructor(
		private readonly repository: ISongRepository,
		private readonly search: SongSearchService
	) {}

	async getDetails(id: SongId) {
		return traceTask("db findOne song", async () => {
			const result = await this.repository.getDetailsById(id);
			if (result === null) {
				throw new AppError("error.song.notfound", "NOT_FOUND", 404);
			}
			return result;
		});
	}

	async create(input: CreateSongRequestDto): Promise<Serialized<Song>> {
		const result = await traceTask("db create song", async () => {
			return await this.repository.create(input);
		});
		try {
			this.search.sync(result.id);
		} catch (e) {
			// TODO: replace log
			console.error(e);
		}
		return result;
	}

	async update(id: SongId, input: UpdateSongRequestDto): Promise<Serialized<Song>> {
		const existing = await this.repository.getById(id);
		if (existing === null) {
			throw new AppError("error.song.notfound", "NOT_FOUND", 404);
		}
		const result = await traceTask("db update song", async () => {
			return await this.repository.update(id, input);
		});
		try {
			this.search.sync(id);
		} catch (e) {
			// TODO: Should we mark this as dirty and sync it later?
			console.error(e);
		}
		return result;
	}

	async delete(id: SongId): Promise<void> {
		const existing = await this.repository.getById(id);
		if (existing === null) {
			throw new AppError("error.song.notfound", "NOT_FOUND", 404);
		}
		await traceTask("db delete song", async () => {
			return await this.repository.softDelete(id);
		});
		try {
			this.search.sync(id);
		} catch (e) {
			console.error(e);
		}
	}
}
