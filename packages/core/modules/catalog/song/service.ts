import { pick, map } from "remeda";
import { AppError } from "@cvsa/core";
import type { Song } from "@cvsa/db";
import type {
	SongDetailsResponseDto,
	SongId,
	ListSongsQueryDto,
	ListSongsResponseDto,
	CreateSongRequestDto,
	UpdateSongRequestDto,
} from "./dto";
import type { ISongRepository } from "./repository.interface";

export class SongService {
	constructor(private readonly repository: ISongRepository) {}

	async getDetails(id: SongId): Promise<SongDetailsResponseDto> {
		const result = await this.repository.getDetailsById(id);
		if (result === null) {
			throw new AppError("Song not found", "NOT_FOUND", 404);
		}
		return result;
	}

	async create(input: CreateSongRequestDto): Promise<Song> {
		return this.repository.create(input);
	}

	async update(id: SongId, input: UpdateSongRequestDto): Promise<Song> {
		const existing = await this.repository.getById(id);
		if (existing === null) {
			throw new AppError("Song not found", "NOT_FOUND", 404);
		}
		return this.repository.update(id, input);
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
			songs: map(
				result.songs,
				pick(["id", "type", "name", "duration", "coverUrl", "publishedAt"])
			),
			total: result.total,
			offset,
			limit,
		};
	}
}
