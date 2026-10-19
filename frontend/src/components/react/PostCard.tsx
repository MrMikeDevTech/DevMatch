import { useState } from "react";
import MarkdownBody from "@/components/react/MarkdownBody";
import CommentsPanel from "@/components/react/CommentsPanel";
import { highlightCode } from "@/lib/highlight";

const BACKEND_URL = import.meta.env.PUBLIC_BACKEND_URL ?? "http://localhost:5001";

export type Post = {
    id: string;
    content: string;
    createdAt: string;
    user: { id: string; username: string; fullName: string; avatarUrl: string | null };
    attachments: Array<{
        id: string;
        type: "image" | "code";
        orderIndex: number;
        imageUrl: string | null;
        codeContent: string | null;
        codeLanguage: string | null;
    }>;
    likeCount: number;
    repostCount: number;
    commentCount: number;
    isLiked: boolean;
    isReposted: boolean;
    repostedBy: { username: string; fullName: string } | null;
};

function timeAgo(iso: string): string {
    const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (seconds < 60) return "now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
}

export default function PostCard({ post }: { post: Post }) {
    const [liked, setLiked] = useState(post.isLiked);
    const [likeCount, setLikeCount] = useState(post.likeCount);
    const [reposted, setReposted] = useState(post.isReposted);
    const [repostCount, setRepostCount] = useState(post.repostCount);
    const [commentsOpen, setCommentsOpen] = useState(false);

    async function toggleLike() {
        const next = !liked;
        setLiked(next);
        setLikeCount((count) => count + (next ? 1 : -1));
        try {
            await fetch(`${BACKEND_URL}/posts/${post.id}/like`, {
                method: next ? "POST" : "DELETE",
                credentials: "include"
            });
        } catch {
            setLiked(!next);
            setLikeCount((count) => count + (next ? -1 : 1));
        }
    }

    async function toggleRepost() {
        const next = !reposted;
        setReposted(next);
        setRepostCount((count) => count + (next ? 1 : -1));
        try {
            await fetch(`${BACKEND_URL}/posts/${post.id}/repost`, {
                method: next ? "POST" : "DELETE",
                credentials: "include"
            });
        } catch {
            setReposted(!next);
            setRepostCount((count) => count + (next ? -1 : 1));
        }
    }

    const sortedAttachments = [...post.attachments].sort((a, b) => a.orderIndex - b.orderIndex);

    return (
        <article className="border-b border-border px-6 py-5">
            {post.repostedBy && (
                <a
                    href={`/profile/${post.repostedBy.username}`}
                    className="mb-2 flex items-center gap-2 text-xs font-medium text-text-muted hover:text-white"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                        <polyline points="17 1 21 5 17 9"></polyline>
                        <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                        <polyline points="7 23 3 19 7 15"></polyline>
                        <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                    </svg>
                    {post.repostedBy.fullName} reposteó
                </a>
            )}
            <div className="flex gap-3">
                {post.user.avatarUrl ? (
                    <img src={post.user.avatarUrl} alt={post.user.fullName} className="h-10 w-10 rounded-full" />
                ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-hover font-bold text-primary">
                        {post.user.fullName.charAt(0).toUpperCase()}
                    </div>
                )}
                <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2 text-sm">
                        <a href={`/profile/${post.user.username}`} className="font-bold text-white hover:underline">
                            {post.user.fullName}
                        </a>
                        <span className="text-text-muted">@{post.user.username}</span>
                        <span className="text-text-muted">· {timeAgo(post.createdAt)}</span>
                    </div>

                    <MarkdownBody source={post.content} className="mt-1 text-sm text-white" />

                    {sortedAttachments.map((attachment) => {
                        if (attachment.type === "image" && attachment.imageUrl) {
                            return (
                                <img
                                    key={attachment.id}
                                    src={attachment.imageUrl}
                                    alt=""
                                    className="mt-3 max-h-96 w-full rounded-lg border border-border object-cover"
                                />
                            );
                        }
                        if (attachment.type === "code" && attachment.codeContent) {
                            const { html, language } = highlightCode(attachment.codeContent, attachment.codeLanguage ?? undefined);
                            return (
                                <pre
                                    key={attachment.id}
                                    className="mt-3 overflow-x-auto rounded-lg border border-border bg-bg p-4 text-xs"
                                >
                                    <code
                                        className={`hljs language-${language}`}
                                        dangerouslySetInnerHTML={{ __html: html }}
                                    />
                                </pre>
                            );
                        }
                        return null;
                    })}

                    <div className="mt-3 flex items-center gap-6 text-sm text-text-muted">
                        <button
                            type="button"
                            onClick={() => setCommentsOpen((v) => !v)}
                            className={`flex items-center gap-1.5 transition-colors ${commentsOpen ? "text-primary" : "hover:text-primary"}`}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                            </svg>
                            {post.commentCount}
                        </button>
                        <button
                            type="button"
                            onClick={toggleRepost}
                            className={`flex items-center gap-1.5 transition-colors ${reposted ? "text-green-400" : "hover:text-green-400"}`}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                                <polyline points="17 1 21 5 17 9"></polyline>
                                <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                                <polyline points="7 23 3 19 7 15"></polyline>
                                <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                            </svg>
                            {repostCount}
                        </button>
                        <button
                            type="button"
                            onClick={toggleLike}
                            className={`flex items-center gap-1.5 transition-colors ${liked ? "text-pink-400" : "hover:text-pink-400"}`}
                        >
                            <svg
                                viewBox="0 0 24 24"
                                fill={liked ? "currentColor" : "none"}
                                stroke="currentColor"
                                strokeWidth="2"
                                className="h-4 w-4"
                            >
                                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
                            </svg>
                            {likeCount}
                        </button>
                    </div>

                    {commentsOpen && <CommentsPanel postId={post.id} />}
                </div>
            </div>
        </article>
    );
}
