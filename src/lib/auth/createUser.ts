import { prisma } from "@lib/prisma";
import type { SignupRequest } from "@routes/auth/signup";
import { Prisma, type User } from "@prisma/generated/client";
import { ConflictError } from "@lib/error/conflict";
import { AppError } from "@lib/error";
import { customAlphabet } from "nanoid";

const alphabet = "123456789ACDEFGHJKLMNPQRSTUVWXYZ";
const nanoid = customAlphabet(alphabet, 7);

/**
 * 创建一个新用户
 * @param {SignupRequest} signupData - 用户注册信息，包括用户名、密码、显示名称和邮箱。
 * @returns {Promise<User>} 返回新创建的用户对象。
 * @throws {ConflictError} 当用户名或邮箱已存在时抛出。
 * @throws {AppError} 当超过最大重试次数仍无法生成唯一的 id 时抛出。
 * @throws {Error} 其他未捕获的 Prisma 数据库错误。
 */
export const createUser = async ({ username, password, displayName, email }: SignupRequest): Promise<User> => {
    const MAX_RETRIES = 5;
    let attempts = 0;

    while (attempts < MAX_RETRIES) {
        try {
            const hashedPassword = await Bun.password.hash(password);
            return await prisma.user.create({
                data: {
                    id: nanoid(),
                    username,
                    password: hashedPassword,
                    displayName,
                    email,
                },
            });
        } catch (e) {
            if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
                const adapterError = e.meta?.driverAdapterError as any;
                const fields = adapterError.cause?.constraint?.fields;

                if (fields.includes("username")) {
                    throw new ConflictError("username", "USERNAME_DUPLICATED", "该用户名已被占用");
                }
                if (fields.includes("email")) {
                    throw new ConflictError("email", "EMAIL_DUPLICATED", "该邮箱已注册");
                }
                // id 生成重复
                if (fields.includes("id")) {
                    attempts++;
                    continue;
                }
                // 其他错误直接抛出
                throw e;
            }
            // 其他错误直接抛出
            throw e;
        }
    }

    throw new AppError("用户创建失败", "ID_GENERATION_FAILED");
};
