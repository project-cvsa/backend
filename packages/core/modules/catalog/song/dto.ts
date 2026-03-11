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

export const createSongSchema = z.object({
	type: SongTypeSchema.nullable().optional(),
	name: z.string().nullable().optional(),
	duration: z.number().nullable().optional(),
	description: z.string().nullable().optional(),
	coverUrl: z.url().nullable().optional(),
	publishedAt: z.date().nullable().optional(),
});

export type CreateSongDto = z.infer<typeof createSongSchema>;

export const UpdateSongSchema = z.object({
	type: SongTypeSchema.nullable().optional(),
	name: z.string().nullable().optional(),
	duration: z.number().nullable().optional(),
	description: z.string().nullable().optional(),
	coverUrl: z.url().nullable().optional(),
	publishedAt: z.date().nullable().optional(),
	deletedAt: z.date().nullable().optional(),
});

export type UpdateSongDto = z.infer<typeof UpdateSongSchema>;

export const ListSongsQuerySchema = z.object({
	search: z.string().optional(),
	type: SongTypeSchema.optional(),
	offset: z.number().int().min(0).optional(),
	limit: z.number().int().min(1).max(100).optional(),
});

export type ListSongsQueryDto = z.infer<typeof ListSongsQuerySchema>;

export type SongDetailsDto = Song & {
	singers: Singer[];
	artists: (Artist & {
		role: ArtistRole;
	})[];
};
