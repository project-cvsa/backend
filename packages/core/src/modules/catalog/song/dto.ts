import { z } from "zod";
import {
	SongSchema,
	SingerSchema,
	ArtistSchema,
	ArtistRoleSchema,
	SongTypeSchema,
	type Serialized,
} from "@cvsa/db";

export type SongId = number;

const CreateCreationSchema = z.object({
	artistId: z.int().positive(),
	roleId: z.int().positive(),
});

const CreatePerformanceSchema = z.object({
	singerId: z.int().positive(),
	voicebankId: z.int().positive().nullish(),
	svsEngineId: z.int().positive().nullish(),
	svsEngineVersionId: z.int().positive().nullish(),
});

const CreateLyricsSchema = z.object({
	language: z.string().optional(),
	isTranslated: z.boolean().optional(),
	plainText: z.string().optional(),
	ttml: z.string().optional(),
	lrc: z.string().optional(),
});

export const CreateSongRequestSchema = z.object({
	name: z.string().nullish(),
	type: SongTypeSchema.nullish(),
	language: z.string().nullish(),
	localizedNames: z.record(z.string(), z.string()).nullish(),
	description: z.string().nullish(),
	localizedDescriptions: z.record(z.string(), z.string()).nullish(),
	duration: z.int().nullish(),
	coverUrl: z.url().nullish(),
	publishedAt: z.iso.datetime().nullish(),
	performances: z.array(CreatePerformanceSchema).optional(),
	creations: z.array(CreateCreationSchema).optional(),
	lyrics: z.array(CreateLyricsSchema).optional(),
});

export const UpdateSongRequestSchema = z.object({
	name: z.string().nullish(),
	type: SongTypeSchema.nullish(),
	duration: z.int().nullish(),
	description: z.string().nullish(),
	coverUrl: z.url().nullish(),
	publishedAt: z.iso.datetime().nullish(),
});

export const SongDetailsResponseSchema = z.intersection(
	SongSchema.omit({ deletedAt: true }),
	z.object({
		singers: z
			.intersection(
				SingerSchema.omit({ deletedAt: true }),
				z.object({
					engine: z.string().nullable(),
				})
			)
			.array(),
		artists: z
			.intersection(
				ArtistSchema.omit({ deletedAt: true }),
				z.object({ role: ArtistRoleSchema })
			)
			.array(),
		lyrics: z.array(
			z.object({
				plainText: z.string().nullable(),
				isTranslated: z.boolean(),
				language: z.string().nullable(),
			})
		),
	})
);

export const SongResponseSchema = SongSchema.omit({ deletedAt: true });

export type SongResponseDto = Serialized<z.Infer<typeof SongResponseSchema>>;
export type CreateSongRequestDto = Serialized<z.infer<typeof CreateSongRequestSchema>>;
export type UpdateSongRequestDto = Serialized<z.infer<typeof UpdateSongRequestSchema>>;
export type SongDetailsResponseDto = Serialized<z.infer<typeof SongDetailsResponseSchema>>;
