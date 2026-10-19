import { Router, type Request, type Response } from "express";
import { prisma } from "@/lib/prisma";
import { requireOnboarded } from "@/lib/authGuard";

const router = Router();

router.post("/:id/like", requireOnboarded, async (req: Request, res: Response) => {
    const commentId = BigInt(String(req.params.id));
    await prisma.commentLike.upsert({
        where: { commentId_userId: { commentId, userId: req.user!.id } },
        create: { commentId, userId: req.user!.id },
        update: {}
    });
    res.status(204).end();
});

router.delete("/:id/like", requireOnboarded, async (req: Request, res: Response) => {
    const commentId = BigInt(String(req.params.id));
    await prisma.commentLike.deleteMany({ where: { commentId, userId: req.user!.id } });
    res.status(204).end();
});

export default router;
