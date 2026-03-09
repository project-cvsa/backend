import type { Session } from "@prisma/generated/client";

export interface CreateSessionData {
    userId: string;
    ipAddress?: string;
    userAgent?: string;
}

// Session with secret for token generation
export type SessionWithSecret = Session & { secret: string };

export interface ISessionRepository {
    create(data: CreateSessionData): Promise<SessionWithSecret>;
    findByIdAndSecretHash(id: string, secretHash: string): Promise<Session | null>;
}
