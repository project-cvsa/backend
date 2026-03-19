import { Elysia } from "elysia";
import { ip } from "elysia-ip";
import { rateLimit } from "elysia-rate-limit";
import { RateLimitError } from "@common/error";
import {
	AppError,
	auth,
	LoginRequestSchema,
	LoginResponseSchema,
	ErrorResponseSchema,
	betterAuthToLoginUserInfoDto,
	toLoginResponse,
    toBetterAuthHeaders,
} from "@project-cvsa/core";

const DAY = 86400;

export const loginHandler = new Elysia()
	.use(ip())
	.use(
		rateLimit({
			scoping: "global",
			max: 50,
			duration: 5 * 60 * 1000,
			generator: () => "",
			errorResponse: new RateLimitError(),
		})
	)
	.post(
		"/session",
		async ({ body, status, headers, cookie: { token: tokenCookie } }) => {
			const { user, token } = await auth.api.signInEmail({
				body: {
					email: body.email,
					password: body.password,
				},
				headers: toBetterAuthHeaders(headers),
			});

			if (!token) {
				throw new AppError("Cannot login", "INTERNAL_SERVER_ERROR", 500, {
					cause: "Better Auth responded with no token",
				});
			}

			tokenCookie.value = token;
			tokenCookie.httpOnly = true;
			tokenCookie.maxAge = 90 * DAY;
			tokenCookie.secure = true;
			tokenCookie.sameSite = "lax";

			const userInfo = betterAuthToLoginUserInfoDto(user, token);
			const response = toLoginResponse(userInfo);

			return status(200, response);
		},
		{
			body: LoginRequestSchema,
			detail: {
				summary: "User Login",
				description: "",
			},
			response: {
				200: LoginResponseSchema,
				401: ErrorResponseSchema,
				422: ErrorResponseSchema,
			},
		}
	);
