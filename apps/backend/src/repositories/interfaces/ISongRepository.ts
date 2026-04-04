import type { Song, SongType, Prisma } from "@project-cvsa/db";

export interface SingerInput {
	singerId: number;
	voicebankId?: number | null;
	svsEngineId?: number | null;
	svsEngineVersionId?: number | null;
}

export interface ArtistInput {
	artistId: number;
	role: string;
}

export interface LyricsInput {
	language?: string | null;
	plainText?: string | null;
	ttml?: string | null;
	lrc?: string | null;
}

export interface CreateSongData {
	type?: SongType | null;
	name?: string | null;
	duration?: number | null;
	description?: string | null;
	singers?: SingerInput[];
	artists?: ArtistInput[];
	lyrics?: LyricsInput[];
}

export interface ISongRepository {
	create(data: CreateSongData, transaction?: Prisma.TransactionClient): Promise<Song>;
}
