import { AppError } from "@lib/error";
import { Elysia } from "elysia";
import z from "zod";
import { ErrorResponseSchema } from "@lib/schema";
import { ConflictError } from "@lib/error/conflict";
import { ip } from "elysia-ip";
import { rateLimit } from "elysia-rate-limit";
import { RateLimitError } from "@lib/error/rateLimit";
import { authServicePlugin } from "./index";

const SignupRequestSchema = z.object({
    username: z.string().min(1),
    password: z.string().min(6),
    displayName: z.string().max(100).optional().nullable(),
    email: z.email().optional().nullable(),
});

const SignupResponse200Schema = z.object({
    message: z.string(),
    data: z.object({
        id: z.string(),
        username: z.string(),
        displayName: z.string().optional().nullable(),
        email: z.email().optional().nullable(),
        token: z.string(),
    }),
});

export type SignupRequest = z.infer<typeof SignupRequestSchema>;

export const signupHandler = new Elysia()
    .use(authServicePlugin)
    .use(ip())
    .use(
        rateLimit({
            scoping: "global",
            max: 50,
            duration: 5 * 60 * 1000,
            generator: () => "", // global limit
            errorResponse: new RateLimitError(),
        })
    )
    .post(
        "/user",
        async ({ body, status, ip, headers, authService }) => {
            try {
                const userAgent = headers["user-agent"];
                const requestBody = SignupRequestSchema.parse(body);
                const { user, token } = await authService.register(requestBody, ip, userAgent);
                return status(200, {
                    message: "Successfully registered",
                    data: {
                        id: user.id,
                        username: user.username,
                        displayName: user.displayName,
                        email: user.email,
                        token,
                    },
                });
            } catch (e) {
                if (e instanceof AppError) {
                    return status(500, { code: e.code, message: e.message });
                } else if (e instanceof ConflictError) {
                    return status(400, { code: e.code, message: e.message });
                } else if (e instanceof z.ZodError) {
                    return status(400, { code: "INVALID_REQUEST", message: e.message });
                } else {
                    return status(500, { code: "SERVER_ERROR", message: "Internal server error" });
                }
            }
        },
        {
            body: SignupRequestSchema,
            detail: {
                summary: "User Registration",
                description: "",
            },
            response: {
                200: SignupResponse200Schema,
                400: ErrorResponseSchema,
                500: ErrorResponseSchema,
            },
        }
    );
