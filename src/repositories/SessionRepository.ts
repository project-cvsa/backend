import { prisma } from "@lib/prisma";
import type { ISessionRepository, CreateSessionData, SessionWithSecret } from "./interfaces";
import type { Session } from "@prisma/generated/client";
import type { PrismaClient } from "@prisma/generated/client";
import crypto from "node:crypto";

export class SessionRepository implements ISessionRepository {
    private prisma: PrismaClient;

    constructor(prismaClient: PrismaClient = prisma) {
        this.prisma = prismaClient;
    }

    async create(data: CreateSessionData): Promise<SessionWithSecret> {
        const sha256Hasher = new Bun.CryptoHasher("sha256");
        // 120 bits entropy
        const id = crypto.randomBytes(15).toString("hex");
        const secret = crypto.randomBytes(15).toString("hex");
        sha256Hasher.update(secret);
        const secretHash = sha256Hasher.digest("hex");

        const session = await this.prisma.session.create({
            data: {
                id,
                userId: data.userId,
                secretHash: secretHash,
                userAgent: data.userAgent,
                ipAddress: data.ipAddress,
            },
        });

        // Return session with the plain secret for token generation
        return Object.assign(session, { secret });
    }

    async findByIdAndSecretHash(id: string, secretHash: string): Promise<Session | null> {
        return await this.prisma.session.findUnique({
            where: {
                id,
                secretHash,
            },
        });
    }
}

// Factory function to create SessionRepository with optional PrismaClient
export function createSessionRepository(prismaClient?: PrismaClient): SessionRepository {
    return new SessionRepository(prismaClient);
}

// Singleton instance (for backward compatibility)
export const sessionRepository = createSessionRepository();
