import { PrismaClient } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import crypto from "crypto";

// Signed login tokens: base64url(JSON payload) + "." + base64url(HMAC-SHA256).
// Only the user id and an expiry are in the payload — the user's accountType is
// re-read from the database on every admin request, so demoting an admin takes
// effect immediately rather than when their token expires.
const TOKEN_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

const tokenSecret = () => process.env.AUTH_TOKEN_SECRET || null;

if (!tokenSecret()) {
    console.error("AUTH_TOKEN_SECRET is not set: logins will not issue tokens and every admin route will reject browser requests.");
}

const sign = (payload: string, secret: string) =>
    crypto.createHmac("sha256", secret).update(payload).digest("base64url");

const safeEqual = (a: string, b: string) => {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
};

export function createToken(userId: string): string | null {
    const secret = tokenSecret();
    if (!secret) return null;
    const payload = Buffer.from(JSON.stringify({ sub: userId, exp: Date.now() + TOKEN_LIFETIME_MS })).toString("base64url");
    return `${payload}.${sign(payload, secret)}`;
}

// Returns the token's user id, or null if it's malformed, tampered with or expired.
export function verifyToken(token: string): string | null {
    const secret = tokenSecret();
    if (!secret) return null;
    const [payload, signature] = token.split(".");
    if (!payload || !signature || !safeEqual(signature, sign(payload, secret))) return null;
    try {
        const { sub, exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
        if (typeof sub !== "string" || typeof exp !== "number" || exp < Date.now()) return null;
        return sub;
    } catch {
        return null;
    }
}

// Strips the password hash before a user row is sent to the client.
export function publicUser<T extends { password: string }>(user: T): Omit<T, "password"> {
    const rest: Omit<T, "password"> & { password?: string } = { ...user };
    delete rest.password;
    return rest;
}

// Lets a request through if it either carries the automation secret
// (`x-admin-secret` header matching ADMIN_API_SECRET, used by scheduled jobs)
// or a valid login token (`Authorization: Bearer <token>`) belonging to a user
// whose accountType is ADMIN.
export function requireAdmin(prisma: PrismaClient) {
    // Request<any> rather than plain Request: a middleware typed with Express's
    // default params type makes TypeScript stop inferring `req.params` from the
    // route path (e.g. "/delete/:id") in the handlers that follow it.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return async (req: Request<any>, res: Response, next: NextFunction) => {
        const automationSecret = process.env.ADMIN_API_SECRET;
        const providedSecret = req.header("x-admin-secret");
        if (providedSecret && automationSecret && safeEqual(providedSecret, automationSecret)) {
            return next();
        }

        const authHeader = req.header("authorization") ?? "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
        const userId = token ? verifyToken(token) : null;
        if (!userId) {
            return res.status(401).json({ error: "Your session has expired or you are not logged in. Log in again." });
        }

        const user = await prisma.user.findUnique({ where: { id: userId }, select: { accountType: true } });
        if (user?.accountType !== "ADMIN") {
            return res.status(403).json({ error: "Admin access required." });
        }
        next();
    };
}

// Requires a valid login token and exposes its user id as res.locals.userId,
// for routes that act on the caller's own data (e.g. submitting rankings).
export function requireUser() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (req: Request<any>, res: Response, next: NextFunction) => {
        const authHeader = req.header("authorization") ?? "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
        const userId = token ? verifyToken(token) : null;
        if (!userId) {
            return res.status(401).json({ error: "Your session has expired or you are not logged in. Log in again." });
        }
        res.locals.userId = userId;
        next();
    };
}
