import { AppError } from "@lib/error";
import { Elysia } from "elysia";
import z from "zod";
import { ErrorResponseSchema } from "@lib/schema";
import { prisma } from "@lib/prisma";

const authSchema = z
    .string()
    // 1. 长度收窄：Bearer (7) + hex(30) + dot(1) + hex(30) = 68
    .length(68, { error: "未登录" })
    .startsWith("Bearer ", { error: "未登录" })
    .transform((val) => val.split(" ")[1])
    // 2. 细化校验：确保剩下的 61 位符合 hex.hex 格式
    .refine((token) => token && /^[0-9a-fA-F]{30}\.[0-9a-fA-F]{30}$/.test(token), { error: "未登录" })
    // 3. 转换为 id 和 secret
    .transform((token) => {
        if (!token) {
            return {
                id: "",
                secret: "",
            };
        }
        const [id, secret] = token.split(".");
        return {
            id,
            secret,
        };
    });

const GetCurrentUser200Schema = z.object({
    id: z.string(),
    username: z.string(),
    displayName: z.string().optional().nullable(),
    email: z.email().optional().nullable(),
});

export const getCurrentUserHandler = new Elysia().get(
    "/me",
    async ({ headers, status }) => {
        try {
            const sha256Hasher = new Bun.CryptoHasher("sha256");
            const auth = headers.authorization;
            const { id, secret } = authSchema.parse(auth);
            if (!id || !secret) {
                return status(401, { code: "UNAUTHORIZED", message: "未登录" });
            }
            sha256Hasher.update(secret);
            const secretHash = sha256Hasher.digest("hex");
            const session = await prisma.session.findUnique({
                where: {
                    id,
                    secretHash,
                },
            });
            if (!session) {
                return status(401, { code: "UNAUTHORIZED", message: "未登录" });
            }
            const user = await prisma.user.findUnique({
                where: {
                    id: session.userId,
                },
            });
            if (!user) {
                return status(401, { code: "UNAUTHORIZED", message: "未登录" });
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
                const firstMessage = e.issues[0]?.message || "请求参数非法";
                return status(400, { code: "INVALID_REQUEST", message: firstMessage });
            } else {
                return status(500, { code: "SERVER_ERROR", message: "内部错误" });
            }
        }
    },
    {
        body: GetCurrentUser200Schema,
        detail: {
            summary: "获取当前用户",
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
