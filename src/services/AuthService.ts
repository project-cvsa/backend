import type { IAuthService, CreateUserData, AuthResult } from "./interfaces";
import type { IUserRepository } from "@repositories/interfaces/IUserRepository";
import type { ISessionRepository } from "@repositories/interfaces/ISessionRepository";
import { userRepository, sessionRepository } from "@repositories/index";
import type { User } from "@prisma/generated/client";

export class AuthService implements IAuthService {
    private userRepository: IUserRepository;
    private sessionRepository: ISessionRepository;

    constructor(
        userRepo: IUserRepository = userRepository,
        sessionRepo: ISessionRepository = sessionRepository
    ) {
        this.userRepository = userRepo;
        this.sessionRepository = sessionRepo;
    }

    async register(data: CreateUserData, ipAddress?: string, userAgent?: string): Promise<AuthResult> {
        const user = await this.userRepository.create(data);
        const session = await this.sessionRepository.create({
            userId: user.id,
            ipAddress,
            userAgent,
        });
        const token = `${session.id}.${session.secret}`;
        return {
            user,
            token,
        };
    }

    async verifyToken(token: string): Promise<User | null> {
        const [id, secret] = token.split(".");
        if (!id || !secret) {
            return null;
        }

        const sha256Hasher = new Bun.CryptoHasher("sha256");
        sha256Hasher.update(secret);
        const secretHash = sha256Hasher.digest("hex");

        const session = await this.sessionRepository.findByIdAndSecretHash(id, secretHash);
        if (!session) {
            return null;
        }

        const user = await this.userRepository.findById(session.userId);
        return user;
    }
}

// Factory function to create AuthService with optional repositories
export function createAuthService(
    userRepo?: IUserRepository,
    sessionRepo?: ISessionRepository
): AuthService {
    return new AuthService(userRepo, sessionRepo);
}

// Singleton instance (for backward compatibility)
export const authService = createAuthService();
