import { Elysia } from "elysia";
import { GetCurrentUserResponseSchema } from "@modules/auth/schema";
import { ErrorResponseSchema } from "@common/schemas";
import { authMiddleware } from "@common/middlewares";

export const getCurrentUserHandler = new Elysia().use(authMiddleware).get(
	"/me",
	async ({ status, user }) => {
		return status(200, {
			id: user.id,
			username: user.username || "",
			displayName: user.name,
			email: user.email,
			createdAt: user.createdAt,
			image: user.image,
		});
	},
	{
		detail: {
			summary: "Get current user",
			description: "",
		},
		response: {
			200: GetCurrentUserResponseSchema,
			400: ErrorResponseSchema,
			401: ErrorResponseSchema,
			422: ErrorResponseSchema,
			500: ErrorResponseSchema,
		},
	}
);
