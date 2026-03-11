import type { Song } from "@project-cvsa/db";
import type { SongDetailsDto } from "./dto";
import type { CreateSongDto, ListSongsQueryDto, SongId, UpdateSongDto } from "./dto";

export interface ISongRepository {
	getById(id: SongId): Promise<Song | null>;
	getDetailsById(id: SongId): Promise<SongDetailsDto | null>;
	list(query?: ListSongsQueryDto): Promise<Song[]>;
	create(input: CreateSongDto): Promise<Song>;
	update(id: SongId, input: UpdateSongDto): Promise<Song>;
	softDelete(id: SongId): Promise<void>;
}
