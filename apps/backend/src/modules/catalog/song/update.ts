import { Elysia } from "elysia";
import { z } from "zod";
import { SongService, UpdateSongSchema, ErrorResponseSchema } from "@project-cvsa/core";
import { AppError } from "@project-cvsa/core";
import { authMiddleware } from "@common/middlewares/auth";

const UpdateSongRequestSchema = UpdateSongSchema;

export const songUpdateHandler = new Elysia({ name: "songUpdateHandler" }).use(authMiddleware).put(
	"/song/:id",
	async ({ params, body }) => {
		const id = Number(params.id);
		if (Number.isNaN(id)) {
			throw new AppError("Invalid song ID", "VALIDATION_ERROR", 400);
		}
		const song = await new SongService().update(id, body);
		return song;
	},
	{
		body: UpdateSongRequestSchema,
		detail: {
			summary: "Update Song",
			description: "Update an existing song (authentication required)",
		},
		response: {
			200: z.object({}).passthrough(),
			400: ErrorResponseSchema,
			401: ErrorResponseSchema,
			404: ErrorResponseSchema,
		},
	}
);
