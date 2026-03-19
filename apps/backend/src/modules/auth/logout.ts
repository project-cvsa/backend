import { Elysia } from "elysia";
import { z } from "zod";
import { authMiddleware } from "@common/middlewares";
import { auth, ErrorResponseSchema, toBetterAuthHeaders } from "@project-cvsa/core";

export const logoutHandler = new Elysia().use(authMiddleware).delete(
	"/session",
	async ({ set, headers, cookie: { token: tokenCookie } }) => {
		await auth.api.signOut({
			headers: toBetterAuthHeaders(headers),
		});

		tokenCookie.remove();

		set.status = 204;
		return null;
	},
	{
		detail: {
			summary: "User Logout",
			description: "",
		},
		response: {
			204: z.null(),
			401: ErrorResponseSchema,
		},
		cookie: z.object({
			token: z.optional(z.string()),
		}),
	}
);
