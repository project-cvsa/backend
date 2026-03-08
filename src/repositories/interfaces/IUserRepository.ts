import type { User } from "@prisma/generated/client";

export interface CreateUserData {
    username: string;
    password: string;
    displayName?: string | null;
    email?: string | null;
}

export interface IUserRepository {
    create(data: CreateUserData): Promise<User>;
    findById(id: string): Promise<User | null>;
    findByUsername(username: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
}
