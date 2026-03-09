import { AppError } from "@lib/error";
import { Elysia } from "elysia";
import z from "zod";
import { ErrorResponseSchema } from "@lib/schema";
import { authServicePlugin } from "./index";

const authSchema = z
    .string()
    // Length: Bearer (7) + hex(30) + dot(1) + hex(30) = 68
    .length(68)
    .startsWith("Bearer ")
    .transform((val) => val.split(" ")[1])
    .refine((token) => token && /^[0-9a-fA-F]{30}\.[0-9a-fA-F]{30}$/.test(token));

const GetCurrentUser200Schema = z.object({
    id: z.string(),
    username: z.string(),
    displayName: z.string().optional().nullable(),
    email: z.email().optional().nullable(),
});

export const getCurrentUserHandler = new Elysia().use(authServicePlugin).get(
    "/me",
    async ({ headers, status, authService }) => {
        try {
            const auth = headers.authorization;
            const token = authSchema.parse(auth);
            if (!token) {
                return status(401, { code: "UNAUTHORIZED", message: "Unauthorized" });
            }
            const user = await authService.verifyToken(token);
            if (!user) {
                return status(401, { code: "UNAUTHORIZED", message: "Unauthorized" });
            }
            return status(200, {
                id: user.id,
                username: user.username,
                displayName: user.displayName,
                email: user.email,
            });
        } catch (e) {
            if (e instanceof AppError) {
                return status(500, { code: e.code, message: e.message });
            } else if (e instanceof z.ZodError) {
                const firstMessage = e.issues[0]?.message || "Invalid request";
                return status(400, { code: "INVALID_REQUEST", message: firstMessage });
            } else {
                return status(500, { code: "SERVER_ERROR", message: "Internal server error" });
            }
        }
    },
    {
        body: GetCurrentUser200Schema,
        detail: {
            summary: "Get current user",
            description: "",
        },
        response: {
            200: GetCurrentUser200Schema,
            400: ErrorResponseSchema,
            401: ErrorResponseSchema,
            500: ErrorResponseSchema,
        },
    }
);
