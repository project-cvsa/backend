import { Elysia } from "elysia";
import { z } from "zod";
import { SongService, ErrorResponseSchema, type SongDetailsDto } from "@cvsa/core";
import { AppError } from "@cvsa/core";

const SongDetailsResponseSchema: z.ZodType<SongDetailsDto> = z.any();

export const songDetailsHandler = new Elysia().get(
	"/song/:id/details",
	async ({ params, status }) => {
		const id = Number(params.id);
		try {
			const song = await new SongService().getDetails(id);
			return song;
		} catch (e) {
			if (e instanceof AppError && e.code === "NOT_FOUND") {
				return status(404, {
					code: e.code,
					message: e.message,
				});
			}
			throw e;
		}
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
