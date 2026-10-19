import { Router, type Request, type Response } from "express";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/authGuard";

const router = Router();

router.get("/focus-areas", requireAuth, async (_req: Request, res: Response) => {
    const focusAreas = await prisma.focusArea.findMany({ orderBy: { name: "asc" } });
    res.json({ focusAreas });
});

router.get("/technologies", requireAuth, async (req: Request, res: Response) => {
    const type = req.query.type;
    const q = typeof req.query.q === "string" ? req.query.q : undefined;

    if (type !== "language" && type !== "framework") {
        res.status(400).json({ error: "type must be 'language' or 'framework'" });
        return;
    }

    const technologies = await prisma.technology.findMany({
        where: {
            type,
            ...(q ? { name: { contains: q, mode: "insensitive" } } : {})
        },
        orderBy: { name: "asc" },
        take: 20
    });
    res.json({ technologies });
});

export default router;
