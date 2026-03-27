import { z } from "zod";
import { SongSchema, SingerSchema, ArtistSchema, ArtistRoleSchema, SongTypeSchema } from "@cvsa/db";

export type SongId = number;

const CreateCreationSchema = z.object({
	artistId: z.int().positive(),
	roleId: z.int().positive(),
});

const CreatePerformanceSchema = z.object({
	singerId: z.int().positive(),
	voicebankId: z.int().positive().nullable().optional(),
	svsEngineId: z.int().positive().nullable().optional(),
	svsEngineVersionId: z.int().positive().nullable().optional(),
});

export const CreateSongRequestSchema = z.object({
	type: SongTypeSchema.nullable().optional(),
	name: z.string().nullable().optional(),
	duration: z.number().nullable().optional(),
	description: z.string().nullable().optional(),
	coverUrl: z.url().nullable().optional(),
	publishedAt: z.date().nullable().optional(),
	performances: z.array(CreatePerformanceSchema).optional(),
	creations: z.array(CreateCreationSchema).optional(),
});

export const UpdateSongRequestSchema = z.object({
	name: z.string().nullable().optional(),
	type: SongTypeSchema.nullable().optional(),
	duration: z.int().nullable().optional(),
	description: z.string().nullable().optional(),
	coverUrl: z.url().nullable().optional(),
	publishedAt: z.date().nullable().optional(),
	performances: z.array(CreatePerformanceSchema).optional(),
	creations: z.array(CreateCreationSchema).optional(),
});

export const ListSongsQuerySchema = z.object({
	search: z.string().optional(),
	type: SongTypeSchema.optional(),
	offset: z.coerce.number().int().min(0).optional(),
	limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const ListSongsResponseSchema = z.object({
	songs: z.array(
		z.object({
			id: z.number(),
			type: SongTypeSchema.nullable(),
			name: z.string().nullable(),
			duration: z.number().nullable(),
			coverUrl: z.url().nullable(),
			publishedAt: z.date().nullable(),
		})
	),
	total: z.number(),
	offset: z.number(),
	limit: z.number(),
});

export const SongDetailsResponseSchema = z.intersection(
	SongSchema,
	z.object({
		singers: SingerSchema.array(),
		artists: z.intersection(ArtistSchema, z.object({ role: ArtistRoleSchema })).array(),
		lyrics: z.array(
			z.object({
				plainText: z.string().nullable(),
				isTranslated: z.boolean(),
				language: z.string().nullable(),
			})
		),
	})
);

export type CreateSongRequestDto = z.infer<typeof CreateSongRequestSchema>;
export type UpdateSongRequestDto = z.infer<typeof UpdateSongRequestSchema>;
export type ListSongsResponseDto = z.infer<typeof ListSongsResponseSchema>;
export type ListSongsQueryDto = z.infer<typeof ListSongsQuerySchema>;
export type SongDetailsResponseDto = z.infer<typeof SongDetailsResponseSchema>;
