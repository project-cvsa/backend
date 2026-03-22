import type { Song } from "@cvsa/db";
import type { SongDetailsDto } from "./dto";
import type { CreateSongDto, ListSongsQueryDto, SongId, UpdateSongDto } from "./dto";

export interface ISongRepository {
	getById(id: SongId): Promise<Song | null>;
	getDetailsById(id: SongId): Promise<SongDetailsDto | null>;
	list(query?: ListSongsQueryDto): Promise<{ songs: Song[]; total: number }>;
	create(input: CreateSongDto): Promise<Song>;
	createWithRelations(input: CreateSongDto): Promise<Song>;
	update(id: SongId, input: UpdateSongDto): Promise<Song>;
	updateWithRelations(id: SongId, input: UpdateSongDto): Promise<Song>;
	softDelete(id: SongId): Promise<void>;
}
