import { Elysia } from "elysia";
import { z } from "zod";
import { SongService, createSongSchema, ErrorResponseSchema } from "@project-cvsa/core";
import { authMiddleware } from "@common/middlewares/auth";

const CreateSongRequestSchema = createSongSchema;

export const songCreateHandler = new Elysia({ name: "songCreateHandler" }).use(authMiddleware).post(
	"/song",
	async ({ body, status }) => {
		const song = await new SongService().create(body);
		return status(201, song);
	},
	{
		body: CreateSongRequestSchema,
		detail: {
			summary: "Create Song",
			description: "Create a new song (authentication required)",
		},
		response: {
			201: z.object({}).passthrough(),
			401: ErrorResponseSchema,
		},
	}
);
