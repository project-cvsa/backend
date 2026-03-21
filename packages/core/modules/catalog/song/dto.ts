import { z } from "zod";
import { SongSchema, SingerSchema, ArtistSchema, ArtistRoleSchema } from "@cvsa/db";

export const SongTypeSchema = z.enum([
	"ORIGINAL",
	"COVER",
	"REMIX",
	"REMASTER",
	"MASHUP",
	"INSTRUMENTAL",
	"OTHERS",
]);

export type SongId = number;

const CreateCreationSchema = z.object({
	artistId: z.number().int().positive(),
	roleId: z.number().int().positive(),
});

const CreatePerformanceSchema = z.object({
	singerId: z.number().int().positive(),
	voicebankId: z.number().int().positive().nullable().optional(),
	svsEngineId: z.number().int().positive().nullable().optional(),
	svsEngineVersionId: z.number().int().positive().nullable().optional(),
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

export type CreateSongRequestDto = z.infer<typeof CreateSongRequestSchema>;

export const UpdateSongRequestSchema = z.object({
	type: SongTypeSchema.nullable().optional(),
	name: z.string().nullable().optional(),
	duration: z.number().nullable().optional(),
	description: z.string().nullable().optional(),
	coverUrl: z.url().nullable().optional(),
	publishedAt: z.date().nullable().optional(),
	deletedAt: z.date().nullable().optional(),
	performances: z.array(CreatePerformanceSchema).optional(),
	creations: z.array(CreateCreationSchema).optional(),
});

export type UpdateSongDto = z.infer<typeof UpdateSongRequestSchema>;

export const ListSongsQuerySchema = z.object({
	search: z.string().optional(),
	type: SongTypeSchema.optional(),
	offset: z.coerce.number().int().min(0).optional(),
	limit: z.coerce.number().int().min(1).max(100).optional(),
});

export type ListSongsQueryDto = z.infer<typeof ListSongsQuerySchema>;

export const ListSongsResponseSchema = z.object({
	songs: z.array(
		z.object({
			id: z.number(),
			type: SongTypeSchema.nullable(),
			name: z.string().nullable(),
			duration: z.number().nullable(),
			description: z.string().nullable(),
			coverUrl: z.url().nullable(),
			publishedAt: z.date().nullable(),
			createdAt: z.date(),
			updatedAt: z.date(),
		})
	),
	total: z.number(),
	offset: z.number(),
	limit: z.number(),
});

export type ListSongsResponseDto = z.infer<typeof ListSongsResponseSchema>;

export const SongDetailsResponseSchema = z.intersection(
	SongSchema,
	z.object({
		singers: SingerSchema.array(),
		artists: z.intersection(ArtistSchema, z.object({ role: ArtistRoleSchema })).array(),
	})
);

export type SongDetailsDto = z.infer<typeof SongDetailsResponseSchema>;
