import { Router, type Request, type Response } from "express";
import { prisma } from "@/lib/prisma";
import { requireOnboarded } from "@/lib/authGuard";
import type { Prisma } from "@/lib/generated/prisma/client";

const router = Router();
const MAX_CONTENT_LENGTH = 5000;

type AttachmentInput = {
    type: "image" | "code";
    orderIndex: number;
    imageUrl?: string;
    codeContent?: string;
    codeLanguage?: string;
};

const POST_INCLUDE = {
    user: { select: { id: true, username: true, fullName: true, avatarUrl: true } },
    attachments: { orderBy: { orderIndex: "asc" } },
    _count: { select: { likes: true, reposts: true, comments: true } }
} satisfies Prisma.PostInclude;

type PostWithInclude = Prisma.PostGetPayload<{ include: typeof POST_INCLUDE }>;

function serializePost(
    post: PostWithInclude,
    likedIds: Set<bigint>,
    repostedIds: Set<bigint>,
    repostedBy: { username: string; fullName: string } | null = null
) {
    return {
        id: post.id.toString(),
        content: post.content,
        createdAt: post.createdAt,
        user: post.user,
        attachments: post.attachments.map((a) => ({ ...a, id: a.id.toString(), postId: a.postId.toString() })),
        likeCount: post._count.likes,
        repostCount: post._count.reposts,
        commentCount: post._count.comments,
        isLiked: likedIds.has(post.id),
        isReposted: repostedIds.has(post.id),
        repostedBy
    };
}

async function viewerInteractionSets(viewerId: string, postIds: bigint[]) {
    const [likes, reposts] = await Promise.all([
        prisma.postLike.findMany({ where: { userId: viewerId, postId: { in: postIds } }, select: { postId: true } }),
        prisma.repost.findMany({ where: { userId: viewerId, postId: { in: postIds } }, select: { postId: true } })
    ]);
    return {
        likedIds: new Set(likes.map((l) => l.postId)),
        repostedIds: new Set(reposts.map((r) => r.postId))
    };
}

router.get("/feed", requireOnboarded, async (req: Request, res: Response) => {
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const cursor = typeof req.query.cursor === "string" ? BigInt(req.query.cursor) : undefined;
    const scope = req.query.scope === "following" ? "following" : "forYou";

    const followedIds = new Set(
        (await prisma.follow.findMany({ where: { followerId: req.user!.id }, select: { followedId: true } })).map(
            (f) => f.followedId
        )
    );

    if (scope === "following") {
        const posts = await prisma.post.findMany({
            where: {
                isDeleted: false,
                userId: { in: [...followedIds] },
                ...(cursor ? { id: { lt: cursor } } : {})
            },
            orderBy: { id: "desc" },
            take: limit,
            include: POST_INCLUDE
        });
        const nextCursor = posts.length === limit ? posts[posts.length - 1]!.id.toString() : null;
        const { likedIds, repostedIds } = await viewerInteractionSets(
            req.user!.id,
            posts.map((p) => p.id)
        );
        res.json({ posts: posts.map((post) => serializePost(post, likedIds, repostedIds)), nextCursor });
        return;
    }

    const posts = await prisma.post.findMany({
        where: { isDeleted: false, ...(cursor ? { id: { lt: cursor } } : {}) },
        orderBy: { id: "desc" },
        take: limit,
        include: POST_INCLUDE
    });

    const nextCursor = posts.length === limit ? posts[posts.length - 1]!.id.toString() : null;
    const { likedIds, repostedIds } = await viewerInteractionSets(
        req.user!.id,
        posts.map((p) => p.id)
    );

    const now = Date.now();
    const scored = posts
        .map((post) => {
            const ageHours = (now - post.createdAt.getTime()) / 3_600_000;
            const engagement = Math.log(1 + post._count.likes + post._count.reposts * 2 + post._count.comments * 1.5);
            const recencyDecay = 1 / (1 + ageHours / 24);
            const followBoost = followedIds.has(post.userId) ? 2 : 0;
            return { post, score: engagement * recencyDecay + followBoost };
        })
        .sort((a, b) => b.score - a.score)
        .map(({ post }) => serializePost(post, likedIds, repostedIds));

    res.json({ posts: scored, nextCursor });
});

router.get("/by/:username", requireOnboarded, async (req: Request, res: Response) => {
    const target = await prisma.user.findUnique({ where: { username: String(req.params.username) } });
    if (!target) {
        res.status(404).json({ error: "User not found" });
        return;
    }

    const limit = Math.min(Number(req.query.limit) || 20, 50);

    const [authoredPosts, repostRows] = await Promise.all([
        prisma.post.findMany({
            where: { userId: target.id, isDeleted: false },
            orderBy: { id: "desc" },
            take: limit,
            include: POST_INCLUDE
        }),
        prisma.repost.findMany({
            where: { userId: target.id, post: { isDeleted: false } },
            orderBy: { id: "desc" },
            take: limit,
            include: { post: { include: POST_INCLUDE } }
        })
    ]);

    const entries = [
        ...authoredPosts.map((post) => ({ post, sortTime: post.createdAt, repostedBy: null })),
        ...repostRows.map((r) => ({
            post: r.post,
            sortTime: r.createdAt,
            repostedBy: { username: target.username, fullName: target.fullName }
        }))
    ]
        .sort((a, b) => b.sortTime.getTime() - a.sortTime.getTime())
        .slice(0, limit);

    const { likedIds, repostedIds } = await viewerInteractionSets(
        req.user!.id,
        entries.map((e) => e.post.id)
    );

    res.json({
        posts: entries.map((e) => serializePost(e.post, likedIds, repostedIds, e.repostedBy)),
        nextCursor: null
    });
});

router.post("/", requireOnboarded, async (req: Request, res: Response) => {
    const body = req.body as { content?: string; attachments?: AttachmentInput[] };
    const content = body.content?.trim();

    if (!content || content.length === 0 || content.length > MAX_CONTENT_LENGTH) {
        res.status(400).json({ error: `content must be 1-${MAX_CONTENT_LENGTH} characters` });
        return;
    }

    const post = await prisma.post.create({
        data: {
            userId: req.user!.id,
            content,
            attachments: {
                create: (body.attachments ?? []).map((a) => ({
                    type: a.type,
                    orderIndex: a.orderIndex,
                    imageUrl: a.imageUrl,
                    codeContent: a.codeContent,
                    codeLanguage: a.codeLanguage
                }))
            }
        },
        include: POST_INCLUDE
    });

    res.status(201).json({ post: serializePost(post, new Set(), new Set()) });
});

router.post("/:id/like", requireOnboarded, async (req: Request, res: Response) => {
    const postId = BigInt(String(req.params.id));
    await prisma.postLike.upsert({
        where: { postId_userId: { postId, userId: req.user!.id } },
        create: { postId, userId: req.user!.id },
        update: {}
    });
    res.status(204).end();
});

router.delete("/:id/like", requireOnboarded, async (req: Request, res: Response) => {
    const postId = BigInt(String(req.params.id));
    await prisma.postLike.deleteMany({ where: { postId, userId: req.user!.id } });
    res.status(204).end();
});

router.post("/:id/repost", requireOnboarded, async (req: Request, res: Response) => {
    const postId = BigInt(String(req.params.id));
    const existing = await prisma.repost.findFirst({ where: { postId, userId: req.user!.id } });
    if (!existing) {
        await prisma.repost.create({ data: { postId, userId: req.user!.id } });
    }
    res.status(204).end();
});

router.delete("/:id/repost", requireOnboarded, async (req: Request, res: Response) => {
    const postId = BigInt(String(req.params.id));
    await prisma.repost.deleteMany({ where: { postId, userId: req.user!.id } });
    res.status(204).end();
});

router.get("/:postId/comments", requireOnboarded, async (req: Request, res: Response) => {
    const postId = BigInt(String(req.params.postId));
    const comments = await prisma.comment.findMany({
        where: { postId, isDeleted: false },
        orderBy: { id: "desc" },
        take: 50,
        include: {
            user: { select: { id: true, username: true, fullName: true, avatarUrl: true } },
            _count: { select: { likes: true } }
        }
    });

    const likedIds = new Set(
        (
            await prisma.commentLike.findMany({
                where: { userId: req.user!.id, commentId: { in: comments.map((c) => c.id) } },
                select: { commentId: true }
            })
        ).map((l) => l.commentId)
    );

    res.json({
        comments: comments.map((comment) => ({
            id: comment.id.toString(),
            postId: comment.postId.toString(),
            content: comment.content,
            createdAt: comment.createdAt,
            user: comment.user,
            likeCount: comment._count.likes,
            isLiked: likedIds.has(comment.id)
        }))
    });
});

router.post("/:postId/comments", requireOnboarded, async (req: Request, res: Response) => {
    const postId = BigInt(String(req.params.postId));
    const content = (req.body as { content?: string }).content?.trim();

    if (!content || content.length === 0 || content.length > 1000) {
        res.status(400).json({ error: "content must be 1-1000 characters" });
        return;
    }

    const comment = await prisma.comment.create({
        data: { postId, userId: req.user!.id, content },
        include: { user: { select: { id: true, username: true, fullName: true, avatarUrl: true } } }
    });

    res.status(201).json({
        comment: {
            id: comment.id.toString(),
            postId: comment.postId.toString(),
            content: comment.content,
            createdAt: comment.createdAt,
            user: comment.user,
            likeCount: 0,
            isLiked: false
        }
    });
});

export default router;
