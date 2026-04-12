import type { SongSearchService } from "@cvsa/core/internal";
import { AppError, type IServiceWithGetDetails } from "@cvsa/core/internal";
import type {
	SongDetailsResponseDto,
	SongId,
	CreateSongRequestDto,
	UpdateSongRequestDto,
	SongResponseDto,
	SongLyricsCreateRequestDto,
	SongLyricsUpdateRequestDto,
	SongLyricsResponseDto,
	SongLyricsListResponseDto,
} from "./dto";
import type { ISongRepository } from "./repository.interface";
import { traceTask } from "@cvsa/observability";
import { appLogger } from "@cvsa/logger";

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

	async create(input: CreateSongRequestDto): Promise<SongResponseDto> {
		const result = await traceTask("db create song", async () => {
			return await this.repository.create(input);
		});
		await traceTask("sync search index", async () => {
			this.search.sync(result.id).catch((e) => {
				appLogger.warn(Bun.inspect(e));
			});
		});
		return result;
	}

	async update(id: SongId, input: UpdateSongRequestDto): Promise<SongResponseDto> {
		const existing = await this.repository.getById(id);
		if (existing === null) {
			throw new AppError("error.song.notfound", "NOT_FOUND", 404);
		}
		const result = await traceTask("db update song", async () => {
			return await this.repository.update(id, input);
		});
		await traceTask("sync search index", async () => {
			this.search.sync(id).catch((e) => {
				// TODO: Should we mark this as dirty and sync it later?
				appLogger.warn(Bun.inspect(e));
			});
		});
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
		await traceTask("sync search index", async () => {
			this.search.sync(id).catch((e) => {
				appLogger.warn(Bun.inspect(e));
			});
		});
	}

	async listLyrics(id: SongId): Promise<SongLyricsListResponseDto> {
		const existing = await this.repository.getById(id);
		if (existing === null) {
			throw new AppError("error.song.notfound", "NOT_FOUND", 404);
		}
		return traceTask("db list lyrics", async () => {
			return await this.repository.getLyricsBySongId(id);
		});
	}

	async getLyric(id: SongId, lyricId: number): Promise<SongLyricsResponseDto> {
		const existing = await this.repository.getById(id);
		if (existing === null) {
			throw new AppError("error.song.notfound", "NOT_FOUND", 404);
		}
		const lyric = await traceTask("db get lyric", async () => {
			return await this.repository.getLyricById(lyricId);
		});
		if (lyric === null) {
			throw new AppError("error.lyric.notfound", "NOT_FOUND", 404);
		}
		return lyric;
	}

	async createLyric(
		id: SongId,
		input: SongLyricsCreateRequestDto
	): Promise<SongLyricsResponseDto> {
		const existing = await this.repository.getById(id);
		if (existing === null) {
			throw new AppError("error.song.notfound", "NOT_FOUND", 404);
		}
		return traceTask("db create lyric", async () => {
			return await this.repository.createLyrics(id, input);
		});
	}

	async updateLyric(
		id: SongId,
		lyricId: number,
		input: SongLyricsUpdateRequestDto
	): Promise<SongLyricsResponseDto> {
		const existing = await this.repository.getById(id);
		if (existing === null) {
			throw new AppError("error.song.notfound", "NOT_FOUND", 404);
		}
		const lyric = await this.repository.getLyricById(lyricId);
		if (lyric === null) {
			throw new AppError("error.lyric.notfound", "NOT_FOUND", 404);
		}
		return traceTask("db update lyric", async () => {
			return await this.repository.updateLyric(lyricId, input);
		});
	}

	async deleteLyric(id: SongId, lyricId: number): Promise<void> {
		const existing = await this.repository.getById(id);
		if (existing === null) {
			throw new AppError("error.song.notfound", "NOT_FOUND", 404);
		}
		const lyric = await this.repository.getLyricById(lyricId);
		if (lyric === null) {
			throw new AppError("error.lyric.notfound", "NOT_FOUND", 404);
		}
		await traceTask("db delete lyric", async () => {
			return await this.repository.softDeleteLyric(lyricId);
		});
	}
}
