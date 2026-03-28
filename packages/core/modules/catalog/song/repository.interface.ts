import type { Song } from "@cvsa/db";
import type { TxClient } from "@cvsa/core/common";
import type {
	CreateSongRequestDto,
	ListSongsQueryDto,
	SongId,
	UpdateSongRequestDto,
	SongDetailsResponseDto,
} from "./dto";

export interface ISongRepository {
	getById(id: SongId, tx?: TxClient): Promise<Song | null>;
	getDetailsById(id: SongId, tx?: TxClient): Promise<SongDetailsResponseDto | null>;
	list(query?: ListSongsQueryDto, tx?: TxClient): Promise<{ songs: Song[]; total: number }>;
	create(input: CreateSongRequestDto, tx?: TxClient): Promise<Song>;
	update(id: SongId, input: UpdateSongRequestDto, tx?: TxClient): Promise<Song>;
	softDelete(id: SongId, tx?: TxClient): Promise<void>;
}
