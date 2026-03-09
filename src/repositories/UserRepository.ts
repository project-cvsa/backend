import { prisma } from "@lib/prisma";
import type { IUserRepository, CreateUserData } from "./interfaces";
import type { User } from "@prisma/generated/client";
import { Prisma, type PrismaClient } from "@prisma/generated/client";
import { ConflictError } from "@lib/error/conflict";
import { AppError } from "@lib/error";
import { customAlphabet } from "nanoid";

const alphabet = "123456789ACDEFGHJKLMNPQRSTUVWXYZ";
const nanoid = customAlphabet(alphabet, 7);

export class UserRepository implements IUserRepository {
    private prisma: PrismaClient;

    constructor(prismaClient: PrismaClient = prisma) {
        this.prisma = prismaClient;
    }

    async create(data: CreateUserData): Promise<User> {
        const MAX_RETRIES = 5;
        let attempts = 0;

        while (attempts < MAX_RETRIES) {
            try {
                const hashedPassword = await Bun.password.hash(data.password);
                return await this.prisma.user.create({
                    data: {
                        id: nanoid(),
                        username: data.username,
                        password: hashedPassword,
                        displayName: data.displayName,
                        email: data.email,
                    },
                });
            } catch (e) {
                if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
                    const adapterError = e.meta?.driverAdapterError as { cause?: { constraint?: { fields?: string[] } } } | undefined;
                    const fields = adapterError?.cause?.constraint?.fields;

                    if (fields?.includes("username")) {
                        throw new ConflictError("username", "USERNAME_DUPLICATED", "该用户名已被占用");
                    }
                    if (fields?.includes("email")) {
                        throw new ConflictError("email", "EMAIL_DUPLICATED", "该邮箱已注册");
                    }
                    // id 生成重复
                    if (fields?.includes("id")) {
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
    }

    async findById(id: string): Promise<User | null> {
        return await this.prisma.user.findUnique({
            where: { id },
        });
    }

    async findByUsername(username: string): Promise<User | null> {
        return await this.prisma.user.findUnique({
            where: { username },
        });
    }

    async findByEmail(email: string): Promise<User | null> {
        return await this.prisma.user.findUnique({
            where: { email },
        });
    }
}

// Factory function to create UserRepository with optional PrismaClient
export function createUserRepository(prismaClient?: PrismaClient): UserRepository {
    return new UserRepository(prismaClient);
}

// Singleton instance (for backward compatibility)
export const userRepository = createUserRepository();
