import { Router, type Request, type Response } from "express";
import { prisma } from "@/lib/prisma";
import { clearSessionCookie, createSessionCookie, getSessionUserId } from "@/lib/session";
import { getImageUrl, uploadImage } from "@/lib/cloudinary";

async function uploadDefaultAvatar(githubAvatarUrl: string): Promise<string> {
    const response = await fetch(githubAvatarUrl);
    const buffer = Buffer.from(await response.arrayBuffer());
    const mimeType = response.headers.get("content-type") ?? "image/png";
    const { publicId } = await uploadImage(buffer, "devmatch/avatars", mimeType);
    return getImageUrl(publicId, { width: 250, height: 250, crop: "fill", gravity: "face" });
}

const router = Router();

function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is not set`);
    return value;
}

async function uniqueUsernameFrom(login: string): Promise<string> {
    const base = login
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "")
        .slice(0, 26) || "dev";

    let candidate = base;
    let suffix = 0;
    while (await prisma.user.findUnique({ where: { username: candidate }, select: { id: true } })) {
        suffix += 1;
        candidate = `${base}${suffix}`.slice(0, 30);
    }
    return candidate;
}

router.get("/github", (_req: Request, res: Response) => {
    const params = new URLSearchParams({
        client_id: requireEnv("GITHUB_CLIENT_ID"),
        redirect_uri: requireEnv("GITHUB_CALLBACK_URL"),
        scope: "read:user user:email"
    });
    res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
});

router.get("/github/callback", async (req: Request, res: Response) => {
    const code = req.query.code;
    const frontendUrl = requireEnv("FRONTEND_URL");

    if (typeof code !== "string") {
        res.redirect(`${frontendUrl}/login?error=missing_code`);
        return;
    }

    try {
        const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({
                client_id: requireEnv("GITHUB_CLIENT_ID"),
                client_secret: requireEnv("GITHUB_CLIENT_SECRET"),
                code,
                redirect_uri: requireEnv("GITHUB_CALLBACK_URL")
            })
        });
        const tokenData = (await tokenResponse.json()) as { access_token?: string };
        if (!tokenData.access_token) {
            res.redirect(`${frontendUrl}/login?error=oauth_failed`);
            return;
        }

        const githubHeaders = {
            Authorization: `Bearer ${tokenData.access_token}`,
            Accept: "application/vnd.github+json",
            "User-Agent": "DevMatch"
        };

        const userResponse = await fetch("https://api.github.com/user", { headers: githubHeaders });
        const githubUser = (await userResponse.json()) as {
            id: number;
            login: string;
            name: string | null;
            avatar_url: string;
            html_url: string;
        };

        const emailsResponse = await fetch("https://api.github.com/user/emails", { headers: githubHeaders });
        const emails = (await emailsResponse.json()) as Array<{ email: string; primary: boolean; verified: boolean }>;
        const primaryEmail = Array.isArray(emails)
            ? emails.find((entry) => entry.primary && entry.verified)?.email
            : undefined;
        const email = primaryEmail ?? `${githubUser.id}@users.noreply.github.com`;

        const githubIdStr = String(githubUser.id);
        const existing = await prisma.user.findUnique({ where: { githubId: githubIdStr }, select: { id: true } });

        const user = existing
            ? await prisma.user.update({
                where: { githubId: githubIdStr },
                data: {
                    githubUsername: githubUser.login,
                    githubUrl: githubUser.html_url
                }
            })
            : await prisma.user.create({
                data: {
                    username: await uniqueUsernameFrom(githubUser.login),
                    email,
                    fullName: githubUser.name ?? githubUser.login,
                    githubId: githubIdStr,
                    githubUsername: githubUser.login,
                    githubUrl: githubUser.html_url,
                    avatarUrl: await uploadDefaultAvatar(githubUser.avatar_url)
                }
            });

        res.setHeader("Set-Cookie", createSessionCookie(user.id));
        res.redirect(frontendUrl);
    } catch (error) {
        console.error("GitHub OAuth error:", error);
        res.redirect(`${frontendUrl}/login?error=oauth_failed`);
    }
});

router.get("/session", async (req: Request, res: Response) => {
    const userId = getSessionUserId(req.headers.cookie);
    if (!userId) {
        res.json({ user: null });
        return;
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true, fullName: true, avatarUrl: true, onboardingCompleted: true }
    });
    res.json({ user });
});

router.post("/logout", (_req: Request, res: Response) => {
    res.setHeader("Set-Cookie", clearSessionCookie());
    res.status(204).end();
});

export default router;
