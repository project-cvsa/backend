import { Elysia } from "elysia";
import { SongService, ErrorResponseSchema, SongDetailsResponseSchema } from "@cvsa/core";
import z from "zod";

export const songDetailsHandler = new Elysia().get(
	"/song/:id/details",
	async ({ params }) => {
		const song = await new SongService().getDetails(params.id);
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
