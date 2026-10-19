import { createHmac } from "crypto";

const SESSION_COOKIE = "session";

function getSecret(): string {
    const secret = process.env.SESSION_SECRET;
    if (!secret) throw new Error("SESSION_SECRET is not set");
    return secret;
}

function sign(payload: string): string {
    return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function createSessionCookie(userId: string): string {
    const payload = Buffer.from(JSON.stringify({ userId })).toString("base64url");
    const signature = sign(payload);
    const value = `${payload}.${signature}`;
    const isProd = process.env.NODE_ENV === "production";
    return [
        `${SESSION_COOKIE}=${value}`,
        "Path=/",
        "HttpOnly",
        `SameSite=${isProd ? "None" : "Lax"}`,
        "Max-Age=604800",
        isProd ? "Secure" : ""
    ]
        .filter(Boolean)
        .join("; ");
}

export function clearSessionCookie(): string {
    const isProd = process.env.NODE_ENV === "production";
    return [
        `${SESSION_COOKIE}=`,
        "Path=/",
        "HttpOnly",
        `SameSite=${isProd ? "None" : "Lax"}`,
        "Max-Age=0",
        isProd ? "Secure" : ""
    ]
        .filter(Boolean)
        .join("; ");
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
    const cookies: Record<string, string> = {};
    if (!cookieHeader) return cookies;
    for (const pair of cookieHeader.split(";")) {
        const index = pair.indexOf("=");
        if (index === -1) continue;
        const key = pair.slice(0, index).trim();
        const value = pair.slice(index + 1).trim();
        cookies[key] = decodeURIComponent(value);
    }
    return cookies;
}

export function getSessionUserId(cookieHeader: string | undefined): string | null {
    const cookies = parseCookies(cookieHeader);
    const value = cookies[SESSION_COOKIE];
    if (!value) return null;

    const [payload, signature] = value.split(".");
    if (!payload || !signature) return null;
    if (sign(payload) !== signature) return null;

    try {
        const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8")) as { userId?: string };
        return typeof parsed.userId === "string" ? parsed.userId : null;
    } catch {
        return null;
    }
}
