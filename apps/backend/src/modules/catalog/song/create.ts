import { Elysia } from "elysia";
import { CreateSongRequestSchema, ErrorResponseSchema, songService } from "@cvsa/core";
import { authMiddleware } from "@common/middlewares/auth";
import { SongSchema } from "@cvsa/db";
import { traceTask } from "@/common/trace";

export const songCreateHandler = new Elysia({ name: "songCreateHandler" }).use(authMiddleware).post(
	"/song",
	async ({ body, status }) => {
		const song = await traceTask("songService.create", async () => {
			return await songService.create(body);
		});
		return status(201, song);
	},
	{
		body: CreateSongRequestSchema,
		detail: {
			summary: "Create Song",
			description: "Create a new song (authentication required)",
		},
		response: {
			201: SongSchema,
			401: ErrorResponseSchema,
		},
	}
);
