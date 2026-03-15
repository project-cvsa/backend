import { z } from "zod";

export const ErrorResponseSchema = z.object({
	code: z.string(),
	message: z.string().optional(),
});

export type ErrorResponseDto = z.infer<typeof ErrorResponseSchema>;
