import { Elysia } from "elysia";
import { CreateSongRequestSchema, CreateSongResponse201Schema } from "@schemas/song";
import { ErrorResponseSchema } from "@schemas/common";
import { songRepository } from "@/containers";

export const createSongHandler = new Elysia()
	.decorate("songRepository", songRepository)
	.post(
		"/song",
		async ({ body, status, songRepository }) => {
			const song = await songRepository.create(body);
			return status(201, {
				message: "Successfully created song",
				data: { id: song.id },
			});
		},
		{
			body: CreateSongRequestSchema,
			detail: {
				summary: "Create Song",
				description: "Creates a new song along with its associated singers, artists, and lyrics.",
			},
			response: {
				201: CreateSongResponse201Schema,
				422: ErrorResponseSchema,
				500: ErrorResponseSchema,
			},
		}
	);
