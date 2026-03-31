import type { Song } from "@cvsa/db";
import type { TxClient, IDetailsRepository, Serialized } from "@cvsa/core/common";
import type {
	CreateSongRequestDto,
	SongId,
	UpdateSongRequestDto,
	SongDetailsResponseDto,
} from "./dto";

export abstract class ISongRepository implements IDetailsRepository<SongDetailsResponseDto> {
	abstract getById(id: SongId, tx?: TxClient): Promise<Serialized<Song> | null>;
	abstract getDetailsById(id: SongId, tx?: TxClient): Promise<SongDetailsResponseDto | null>;
	abstract create(input: CreateSongRequestDto, tx?: TxClient): Promise<Serialized<Song>>;
	abstract update(
		id: SongId,
		input: UpdateSongRequestDto,
		tx?: TxClient
	): Promise<Serialized<Song>>;
	abstract softDelete(id: SongId, tx?: TxClient): Promise<void>;
}
