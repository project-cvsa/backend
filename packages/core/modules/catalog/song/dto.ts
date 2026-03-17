import { z } from "zod";
import type { Song, Singer, Artist, ArtistRole } from "@project-cvsa/db";

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

// Performance DTOs
export const CreatePerformanceSchema = z.object({
	singerId: z.number().int().positive(),
	voicebankId: z.number().int().positive().nullable().optional(),
	svsEngineId: z.number().int().positive().nullable().optional(),
	svsEngineVersionId: z.number().int().positive().nullable().optional(),
});

export type CreatePerformanceDto = z.infer<typeof CreatePerformanceSchema>;

// Creation DTOs
export const CreateCreationSchema = z.object({
	artistId: z.number().int().positive(),
	roleId: z.number().int().positive(),
});

export type CreateCreationDto = z.infer<typeof CreateCreationSchema>;

// Song with relations DTOs
export const createSongSchema = z.object({
	type: SongTypeSchema.nullable().optional(),
	name: z.string().nullable().optional(),
	duration: z.number().nullable().optional(),
	description: z.string().nullable().optional(),
	coverUrl: z.string().url().nullable().optional(),
	publishedAt: z.date().nullable().optional(),
	performances: z.array(CreatePerformanceSchema).optional(),
	creations: z.array(CreateCreationSchema).optional(),
});

export type CreateSongDto = z.infer<typeof createSongSchema>;

export const UpdateSongSchema = z.object({
	type: SongTypeSchema.nullable().optional(),
	name: z.string().nullable().optional(),
	duration: z.number().nullable().optional(),
	description: z.string().nullable().optional(),
	coverUrl: z.string().url().nullable().optional(),
	publishedAt: z.date().nullable().optional(),
	deletedAt: z.date().nullable().optional(),
	performances: z.array(CreatePerformanceSchema).optional(),
	creations: z.array(CreateCreationSchema).optional(),
});

export type UpdateSongDto = z.infer<typeof UpdateSongSchema>;

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
			coverUrl: z.string().url().nullable(),
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

export type SongDetailsDto = Song & {
	singers: Singer[];
	artists: (Artist & {
		role: ArtistRole;
	})[];
};
