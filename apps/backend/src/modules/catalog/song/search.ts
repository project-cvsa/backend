import { Elysia } from "elysia";
import { songSearchService } from "@cvsa/core";
import z from "zod";

// TODO: add corresponding DTO and response schema
export const songSearchHandler = new Elysia().get(
	"/songs",
	async ({ query, status }) => {
		const song = await songSearchService.search(query.q || "");
		return status(200, song);
	},
	{
		detail: {
			summary: "Search for Songs",
			description: "",
		},
		query: z.object({
			q: z.string().optional(),
		}),
	}
);
