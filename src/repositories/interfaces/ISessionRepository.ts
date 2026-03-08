import type { Session } from "@prisma/generated/client";

export interface CreateSessionData {
    userId: string;
    ipAddress?: string;
    userAgent?: string;
}

export interface ISessionRepository {
    create(data: CreateSessionData): Promise<Session>;
    findByIdAndSecretHash(id: string, secretHash: string): Promise<Session | null>;
}
