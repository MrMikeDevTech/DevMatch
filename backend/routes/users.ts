import { Router, type Request, type Response } from "express";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireOnboarded } from "@/lib/authGuard";

const router = Router();

const PROFILE_INCLUDE = {
    role: true,
    focusArea: true,
    technologies: { include: { technology: true } },
    _count: { select: { followers: true, following: true, posts: true } }
} as const;

router.get("/me", requireAuth, async (req: Request, res: Response) => {
    const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        include: PROFILE_INCLUDE
    });
    res.json({ user });
});

router.patch("/me", requireAuth, async (req: Request, res: Response) => {
    const body = req.body as {
        username?: string;
        fullName?: string;
        professionalTitle?: string;
        bioMarkdown?: string;
        focusId?: number;
        technologyIds?: number[];
        onboardingCompleted?: boolean;
        avatarUrl?: string;
        bannerUrl?: string;
    };

    try {
        const user = await prisma.$transaction(async (tx) => {
            if (body.technologyIds) {
                await tx.userTechnology.deleteMany({ where: { userId: req.user!.id } });
                if (body.technologyIds.length > 0) {
                    await tx.userTechnology.createMany({
                        data: body.technologyIds.map((technologyId) => ({ userId: req.user!.id, technologyId }))
                    });
                }
            }

            return tx.user.update({
                where: { id: req.user!.id },
                data: {
                    ...(body.username !== undefined ? { username: body.username } : {}),
                    ...(body.fullName !== undefined ? { fullName: body.fullName } : {}),
                    ...(body.professionalTitle !== undefined ? { professionalTitle: body.professionalTitle } : {}),
                    ...(body.bioMarkdown !== undefined ? { bioMarkdown: body.bioMarkdown } : {}),
                    ...(body.focusId !== undefined ? { focusId: body.focusId } : {}),
                    ...(body.onboardingCompleted !== undefined ? { onboardingCompleted: body.onboardingCompleted } : {}),
                    ...(body.avatarUrl !== undefined ? { avatarUrl: body.avatarUrl } : {}),
                    ...(body.bannerUrl !== undefined ? { bannerUrl: body.bannerUrl } : {})
                },
                include: PROFILE_INCLUDE
            });
        });

        res.json({ user });
    } catch (error) {
        if (error instanceof Error && "code" in error && error.code === "P2002") {
            res.status(409).json({ error: "Username already taken" });
            return;
        }
        throw error;
    }
});

router.get("/check-username", requireAuth, async (req: Request, res: Response) => {
    const value = typeof req.query.value === "string" ? req.query.value : "";
    const valid = /^[a-z0-9_]{3,30}$/.test(value);
    if (!valid) {
        res.json({ available: false });
        return;
    }

    const existing = await prisma.user.findUnique({ where: { username: value }, select: { id: true } });
    res.json({ available: !existing || existing.id === req.user!.id });
});

router.get("/:username", requireAuth, async (req: Request, res: Response) => {
    const target = await prisma.user.findUnique({
        where: { username: String(req.params.username) },
        include: PROFILE_INCLUDE
    });

    if (!target) {
        res.status(404).json({ error: "User not found" });
        return;
    }

    const [isFollowing, isFollowedBy] = await Promise.all([
        prisma.follow.findUnique({
            where: { followerId_followedId: { followerId: req.user!.id, followedId: target.id } }
        }),
        prisma.follow.findUnique({
            where: { followerId_followedId: { followerId: target.id, followedId: req.user!.id } }
        })
    ]);

    res.json({
        user: { ...target, isFollowing: Boolean(isFollowing), isFollowedBy: Boolean(isFollowedBy) }
    });
});

router.post("/:username/follow", requireOnboarded, async (req: Request, res: Response) => {
    const target = await prisma.user.findUnique({ where: { username: String(req.params.username) } });
    if (!target) {
        res.status(404).json({ error: "User not found" });
        return;
    }
    if (target.id === req.user!.id) {
        res.status(400).json({ error: "Cannot follow yourself" });
        return;
    }

    await prisma.follow.upsert({
        where: { followerId_followedId: { followerId: req.user!.id, followedId: target.id } },
        create: { followerId: req.user!.id, followedId: target.id },
        update: {}
    });

    res.status(204).end();
});

router.delete("/:username/follow", requireOnboarded, async (req: Request, res: Response) => {
    const target = await prisma.user.findUnique({ where: { username: String(req.params.username) } });
    if (!target) {
        res.status(404).json({ error: "User not found" });
        return;
    }

    await prisma.follow.deleteMany({ where: { followerId: req.user!.id, followedId: target.id } });
    res.status(204).end();
});

export default router;
