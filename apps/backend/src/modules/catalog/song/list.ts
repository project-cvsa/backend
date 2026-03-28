import { Elysia } from "elysia";
import { ListSongsQuerySchema, ListSongsResponseSchema, songService } from "@cvsa/core";

export const songListHandler = new Elysia({ name: "songListHandler" }).get(
	"/song",
	async ({ query }) => {
		const result = await songService.list(query);
		return result;
	},
	{
		query: ListSongsQuerySchema,
		detail: {
			summary: "List Songs",
			description: "List songs with pagination (no authentication required)",
		},
		response: {
			200: ListSongsResponseSchema,
		},
	}
);
