import type { NextFunction, Request, Response } from "express";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
    const userId = getSessionUserId(req.headers.cookie);
    if (!userId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
        res.status(401).json({ error: "Not authenticated" });
        return;
    }

    req.user = user;
    next();
}

export async function requireOnboarded(req: Request, res: Response, next: NextFunction) {
    await requireAuth(req, res, () => {
        if (!req.user?.onboardingCompleted) {
            res.status(403).json({ error: "Onboarding not completed" });
            return;
        }
        next();
    });
}
