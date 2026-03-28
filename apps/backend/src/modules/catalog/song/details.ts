import { Elysia } from "elysia";
import { ErrorResponseSchema, SongDetailsResponseSchema, songService } from "@cvsa/core";
import z from "zod";

export const songDetailsHandler = new Elysia().get(
	"/song/:id/details",
	async ({ params }) => {
		const song = await songService.getDetails(params.id);
		return song;
	},
	{
		detail: {
			summary: "Song Details",
			description: "",
		},
		response: {
			200: SongDetailsResponseSchema,
			400: ErrorResponseSchema,
			404: ErrorResponseSchema,
		},
		params: z.object({
			id: z.int().positive(),
		}),
	}
);
