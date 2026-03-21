import { Elysia } from "elysia";
import { SongService, ErrorResponseSchema, SongDetailsResponseSchema } from "@cvsa/core";

export const songDetailsHandler = new Elysia().get(
	"/song/:id/details",
	async ({ params }) => {
		const id = Number(params.id);
		const song = await new SongService().getDetails(id);
		return song;
	},
	{
		detail: {
			summary: "Song Details",
			description: "",
		},
		response: {
			200: SongDetailsResponseSchema,
			404: ErrorResponseSchema,
		},
	}
);
