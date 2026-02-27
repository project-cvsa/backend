import { prisma } from "@lib/prisma";
import crypto from "node:crypto";

export const createSession = async (uid: string, ipAddress?: string, userAgent?: string) => {
    const sha256Hasher = new Bun.CryptoHasher("sha256");
    // 120 bits entropy
    const id = crypto.randomBytes(15).toString("hex");
    const secret = crypto.randomBytes(15).toString("hex");
    sha256Hasher.update(secret);
    const secretHash = sha256Hasher.digest("hex");
    const session = await prisma.session.create({
        data: {
            id,
            userId: uid,
            secretHash: secretHash,
            userAgent,
            ipAddress,
        },
    });
    return `${session.id}.${secret}`;
};
