import type { OutboxService } from "@cvsa/core/internal";
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
import { prisma } from "@cvsa/db";

export class SongService implements IServiceWithGetDetails<SongDetailsResponseDto> {
	constructor(
		private readonly repository: ISongRepository,
		private readonly outbox: OutboxService
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
		return traceTask("db create song", async () => {
			return await prisma.$transaction(async (tx) => {
				const result = await this.repository.create(input, tx);
				await this.outbox.createEntry(
					{
						aggregateType: "song",
						aggregateId: result.id,
						eventType: "song.created",
					},
					tx
				);
				return result;
			});
		});
	}

	async update(id: SongId, input: UpdateSongRequestDto): Promise<SongResponseDto> {
		const existing = await this.repository.getById(id);
		if (existing === null) {
			throw new AppError("error.song.notfound", "NOT_FOUND", 404);
		}
		return traceTask("db update song", async () => {
			return await prisma.$transaction(async (tx) => {
				const result = await this.repository.update(id, input, tx);
				await this.outbox.createEntry(
					{
						aggregateType: "song",
						aggregateId: id,
						eventType: "song.updated",
					},
					tx
				);
				return result;
			});
		});
	}

	async delete(id: SongId): Promise<void> {
		const existing = await this.repository.getById(id);
		if (existing === null) {
			throw new AppError("error.song.notfound", "NOT_FOUND", 404);
		}
		return traceTask("db delete song", async () => {
			await prisma.$transaction(async (tx) => {
				await this.repository.softDelete(id, tx);
				await this.outbox.createEntry(
					{
						aggregateType: "song",
						aggregateId: id,
						eventType: "song.deleted",
					},
					tx
				);
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
			return await prisma.$transaction(async (tx) => {
				const result = await this.repository.createLyrics(id, input, tx);
				await this.outbox.createEntry(
					{
						aggregateType: "song",
						aggregateId: id,
						eventType: "song.lyric_created",
					},
					tx
				);
				return result;
			});
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
			return await prisma.$transaction(async (tx) => {
				const result = await this.repository.updateLyric(lyricId, input, tx);
				await this.outbox.createEntry(
					{
						aggregateType: "song",
						aggregateId: id,
						eventType: "song.lyric_updated",
					},
					tx
				);
				return result;
			});
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
		return traceTask("db delete lyric", async () => {
			await prisma.$transaction(async (tx) => {
				await this.repository.softDeleteLyric(lyricId, tx);
				await this.outbox.createEntry(
					{
						aggregateType: "song",
						aggregateId: id,
						eventType: "song.lyric_deleted",
					},
					tx
				);
			});
		});
	}
}
