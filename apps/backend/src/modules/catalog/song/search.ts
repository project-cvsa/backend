import { Elysia } from "elysia";
import { songSearchService } from "@cvsa/core";
import z from "zod";
import { traceTask } from "@/common/trace";

// TODO: add corresponding DTO and response schema
export const songSearchHandler = new Elysia().get(
	"/songs",
	async ({ query, status }) => {
		const song = await traceTask("songSearchService.search", async () => {
			return await songSearchService.search(query.q || "");
		});
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
