import type { Song } from "@cvsa/db";
import type { SongDetailsResponseDto } from "./dto";
import type { CreateSongRequestDto, ListSongsQueryDto, SongId, UpdateSongRequestDto } from "./dto";

export interface ISongRepository {
	getById(id: SongId): Promise<Song | null>;
	getDetailsById(id: SongId): Promise<SongDetailsResponseDto | null>;
	list(query?: ListSongsQueryDto): Promise<{ songs: Song[]; total: number }>;
	create(input: CreateSongRequestDto): Promise<Song>;
	update(id: SongId, input: UpdateSongRequestDto): Promise<Song>;
	softDelete(id: SongId): Promise<void>;
}
