import z from "zod";
import { SongType } from "@project-cvsa/db";

export const SingerInputSchema = z.object({
	singerId: z.number().int(),
	voicebankId: z.number().int().optional().nullable(),
	svsEngineId: z.number().int().optional().nullable(),
	svsEngineVersionId: z.number().int().optional().nullable(),
});

export const ArtistInputSchema = z.object({
	artistId: z.number().int(),
	role: z.string().min(1),
});

export const LyricsInputSchema = z.object({
	language: z.string().optional().nullable(),
	plainText: z.string().optional().nullable(),
	ttml: z.string().optional().nullable(),
	lrc: z.string().optional().nullable(),
});

export const CreateSongRequestSchema = z.object({
	type: z.nativeEnum(SongType).optional().nullable(),
	name: z.string().optional().nullable(),
	duration: z.number().int().nonnegative().optional().nullable(),
	description: z.string().optional().nullable(),
	singers: z.array(SingerInputSchema).optional(),
	artists: z.array(ArtistInputSchema).optional(),
	lyrics: z.array(LyricsInputSchema).optional(),
});

export type CreateSongRequestDto = z.infer<typeof CreateSongRequestSchema>;

export const CreateSongResponse201Schema = z.object({
	message: z.string(),
	data: z.object({
		id: z.number(),
	}),
});
