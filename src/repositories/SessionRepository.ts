import { prisma } from "@lib/prisma";
import type { ISessionRepository, CreateSessionData } from "./interfaces";
import type { Session } from "@prisma/generated/client";
import crypto from "node:crypto";

type SessionWithSecret = Session & { secret: string };

export class SessionRepository implements ISessionRepository {
    async create(data: CreateSessionData): Promise<SessionWithSecret> {
        const sha256Hasher = new Bun.CryptoHasher("sha256");
        // 120 bits entropy
        const id = crypto.randomBytes(15).toString("hex");
        const secret = crypto.randomBytes(15).toString("hex");
        sha256Hasher.update(secret);
        const secretHash = sha256Hasher.digest("hex");

        const session = await prisma.session.create({
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
        return await prisma.session.findUnique({
            where: {
                id,
                secretHash,
            },
        });
    }
}

// Singleton instance
export const sessionRepository = new SessionRepository();
