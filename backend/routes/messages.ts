import { Router, type Request, type Response } from "express";
import { prisma } from "@/lib/prisma";
import { requireOnboarded } from "@/lib/authGuard";
import { getOrCreateConversation } from "@/lib/conversations";

const router = Router();
const USER_SELECT = { id: true, username: true, fullName: true, avatarUrl: true } as const;

router.get("/", requireOnboarded, async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const conversations = await prisma.conversation.findMany({
        where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
        orderBy: { updatedAt: "desc" },
        include: {
            user1: { select: USER_SELECT },
            user2: { select: USER_SELECT },
            messages: { orderBy: { id: "desc" }, take: 1 }
        }
    });

    const otherIds = conversations.map((c) => (c.user1Id === userId ? c.user2Id : c.user1Id));

    const [unreadCounts, following, followedBy] = await Promise.all([
        prisma.message.groupBy({
            by: ["conversationId"],
            where: { conversationId: { in: conversations.map((c) => c.id) }, senderId: { not: userId }, readAt: null },
            _count: { id: true }
        }),
        prisma.follow.findMany({ where: { followerId: userId, followedId: { in: otherIds } }, select: { followedId: true } }),
        prisma.follow.findMany({ where: { followedId: userId, followerId: { in: otherIds } }, select: { followerId: true } })
    ]);

    const unreadMap = new Map(unreadCounts.map((u) => [u.conversationId, u._count.id]));
    const followingSet = new Set(following.map((f) => f.followedId));
    const followedBySet = new Set(followedBy.map((f) => f.followerId));

    res.json({
        conversations: conversations.map((c) => {
            const other = c.user1Id === userId ? c.user2 : c.user1;
            const lastMessage = c.messages[0];
            return {
                id: c.id,
                otherUser: other,
                isFriends: followingSet.has(other.id) && followedBySet.has(other.id),
                lastMessage: lastMessage
                    ? {
                            content: lastMessage.content ?? (lastMessage.imageUrl ? "📷 Imagen" : "💻 Código"),
                            createdAt: lastMessage.createdAt,
                            isMine: lastMessage.senderId === userId
                        }
                    : null,
                unreadCount: unreadMap.get(c.id) ?? 0,
                updatedAt: c.updatedAt
            };
        })
    });
});

router.get("/:username", requireOnboarded, async (req: Request, res: Response) => {
    const target = await prisma.user.findUnique({ where: { username: String(req.params.username) } });
    if (!target) {
        res.status(404).json({ error: "User not found" });
        return;
    }

    const conversation = await getOrCreateConversation(req.user!.id, target.id);

    const limit = Math.min(Number(req.query.limit) || 30, 50);
    const cursor = typeof req.query.cursor === "string" ? BigInt(req.query.cursor) : undefined;

    const messages = await prisma.message.findMany({
        where: { conversationId: conversation.id, ...(cursor ? { id: { lt: cursor } } : {}) },
        orderBy: { id: "desc" },
        take: limit,
        include: { sender: { select: USER_SELECT } }
    });

    const nextCursor = messages.length === limit ? messages[messages.length - 1]!.id.toString() : null;

    res.json({
        conversationId: conversation.id,
        otherUser: { id: target.id, username: target.username, fullName: target.fullName, avatarUrl: target.avatarUrl },
        messages: messages
            .slice()
            .reverse()
            .map((m) => ({
                id: m.id.toString(),
                conversationId: m.conversationId,
                content: m.content,
                imageUrl: m.imageUrl,
                codeContent: m.codeContent,
                codeLanguage: m.codeLanguage,
                createdAt: m.createdAt,
                sender: m.sender
            })),
        nextCursor
    });
});

router.post("/:username/read", requireOnboarded, async (req: Request, res: Response) => {
    const target = await prisma.user.findUnique({ where: { username: String(req.params.username) } });
    if (!target) {
        res.status(404).json({ error: "User not found" });
        return;
    }

    const conversation = await getOrCreateConversation(req.user!.id, target.id);
    await prisma.message.updateMany({
        where: { conversationId: conversation.id, senderId: target.id, readAt: null },
        data: { readAt: new Date() }
    });

    res.status(204).end();
});

export default router;
