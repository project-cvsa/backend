import { Elysia } from "elysia";
import { z } from "zod";
import { ErrorResponseSchema, songService } from "@cvsa/core";
import { AppError } from "@cvsa/core";
import { authMiddleware } from "@common/middlewares/auth";

export const songDeleteHandler = new Elysia({ name: "songDeleteHandler" })
	.use(authMiddleware)
	.delete(
		"/song/:id",
		async ({ params, set }) => {
			const id = Number(params.id);
			if (Number.isNaN(id)) {
				throw new AppError("Invalid song ID", "VALIDATION_ERROR", 400);
			}
			await songService.delete(id);
			set.status = 204;
			return null;
		},
		{
			detail: {
				summary: "Delete Song",
				description: "Soft delete a song (authentication required)",
			},
			response: {
				204: z.null(),
				400: ErrorResponseSchema,
				401: ErrorResponseSchema,
				404: ErrorResponseSchema,
			},
		}
	);
