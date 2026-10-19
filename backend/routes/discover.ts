import { Router, type Request, type Response } from "express";
import { prisma } from "@/lib/prisma";
import { requireOnboarded } from "@/lib/authGuard";

const router = Router();

type DiscoverRow = {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
    banner_url: string | null;
    professional_title: string | null;
    bio_markdown: string | null;
    is_verified: boolean;
};

router.get("/queue", requireOnboarded, async (req: Request, res: Response) => {
    const limit = Math.min(Number(req.query.limit) || 10, 25);
    const userId = req.user!.id;

    const rows = await prisma.$queryRaw<DiscoverRow[]>`
        SELECT u.id, u.username, u.full_name, u.avatar_url, u.banner_url, u.professional_title, u.bio_markdown, u.is_verified,
               (
                   SELECT COUNT(*)::int FROM user_technologies ut2
                   JOIN user_technologies ut1 ON ut1.technology_id = ut2.technology_id
                   WHERE ut1.user_id = ${userId}::uuid AND ut2.user_id = u.id
               ) AS shared_tech_count
        FROM users u
        WHERE u.id != ${userId}::uuid
          AND u.is_active = true
          AND NOT EXISTS (
              SELECT 1 FROM follows f WHERE f.follower_id = ${userId}::uuid AND f.followed_id = u.id
          )
          AND NOT EXISTS (
              SELECT 1 FROM discover_actions da
              WHERE da.user_id = ${userId}::uuid AND da.target_user_id = u.id
                AND da.action = 'pass' AND da.created_at > now() - interval '1 hour'
          )
        ORDER BY shared_tech_count DESC,
                 (u.focus_id = (SELECT focus_id FROM users WHERE id = ${userId}::uuid)) DESC,
                 u.created_at DESC
        LIMIT ${limit}
    `;

    const userIds = rows.map((r) => r.id);
    const technologies = userIds.length
        ? await prisma.userTechnology.findMany({
            where: { userId: { in: userIds } },
            include: { technology: true }
        })
        : [];

    const techByUser = new Map<string, Array<{ id: number; name: string; type: string }>>();
    for (const entry of technologies) {
        const list = techByUser.get(entry.userId) ?? [];
        list.push({ id: entry.technology.id, name: entry.technology.name, type: entry.technology.type });
        techByUser.set(entry.userId, list);
    }

    const candidates = rows.map((row) => ({
        id: row.id,
        username: row.username,
        fullName: row.full_name,
        avatarUrl: row.avatar_url,
        bannerUrl: row.banner_url,
        professionalTitle: row.professional_title,
        bioMarkdown: row.bio_markdown,
        isVerified: row.is_verified,
        technologies: techByUser.get(row.id) ?? []
    }));

    res.json({ candidates });
});

router.post("/actions", requireOnboarded, async (req: Request, res: Response) => {
    const body = req.body as { targetUserId?: string; action?: "like" | "pass" };

    if (!body.targetUserId || (body.action !== "like" && body.action !== "pass")) {
        res.status(400).json({ error: "targetUserId and action ('like'|'pass') are required" });
        return;
    }
    if (body.targetUserId === req.user!.id) {
        res.status(400).json({ error: "Cannot act on yourself" });
        return;
    }

    const target = await prisma.user.findUnique({ where: { id: body.targetUserId } });
    if (!target) {
        res.status(404).json({ error: "User not found" });
        return;
    }

    await prisma.discoverAction.create({
        data: { userId: req.user!.id, targetUserId: target.id, action: body.action }
    });

    if (body.action === "like") {
        await prisma.follow.upsert({
            where: { followerId_followedId: { followerId: req.user!.id, followedId: target.id } },
            create: { followerId: req.user!.id, followedId: target.id },
            update: {}
        });
    }

    res.status(204).end();
});

export default router;
