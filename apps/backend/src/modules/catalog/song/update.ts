import { Elysia } from "elysia";
import { UpdateSongRequestSchema, ErrorResponseSchema, songService } from "@cvsa/core";
import { AppError } from "@cvsa/core";
import { authMiddleware } from "@common/middlewares/auth";
import { SongSchema } from "@cvsa/db";

export const songUpdateHandler = new Elysia({ name: "songUpdateHandler" })
	.use(authMiddleware)
	.patch(
		"/song/:id",
		async ({ params, body, status }) => {
			const id = Number(params.id);
			if (Number.isNaN(id)) {
				throw new AppError("Invalid song ID", "VALIDATION_ERROR", 400);
			}
			const song = await songService.update(id, body);
			return status(200, song);
		},
		{
			body: UpdateSongRequestSchema,
			detail: {
				summary: "Update Song",
				description: "Update an existing song (authentication required)",
			},
			response: {
				200: SongSchema,
				400: ErrorResponseSchema,
				401: ErrorResponseSchema,
				404: ErrorResponseSchema,
			},
		}
	);
