import { useEffect, useState } from "react";

const BACKEND_URL = import.meta.env.PUBLIC_BACKEND_URL ?? "http://localhost:5001";

type Comment = {
    id: string;
    content: string;
    createdAt: string;
    user: { id: string; username: string; fullName: string; avatarUrl: string | null };
    likeCount: number;
    isLiked: boolean;
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

function CommentRow({ comment }: { comment: Comment }) {
    const [liked, setLiked] = useState(comment.isLiked);
    const [likeCount, setLikeCount] = useState(comment.likeCount);

    async function toggleLike() {
        const next = !liked;
        setLiked(next);
        setLikeCount((count) => count + (next ? 1 : -1));
        try {
            await fetch(`${BACKEND_URL}/comments/${comment.id}/like`, {
                method: next ? "POST" : "DELETE",
                credentials: "include"
            });
        } catch {
            setLiked(!next);
            setLikeCount((count) => count + (next ? -1 : 1));
        }
    }

    return (
        <div className="flex gap-2 py-3">
            {comment.user.avatarUrl ? (
                <img src={comment.user.avatarUrl} alt={comment.user.fullName} className="h-7 w-7 rounded-full" />
            ) : (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-hover text-xs font-bold text-primary">
                    {comment.user.fullName.charAt(0).toUpperCase()}
                </div>
            )}
            <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2 text-xs">
                    <span className="font-bold text-white">{comment.user.fullName}</span>
                    <span className="text-text-muted">@{comment.user.username}</span>
                    <span className="text-text-muted">· {timeAgo(comment.createdAt)}</span>
                </div>
                <p className="mt-0.5 text-sm text-white">{comment.content}</p>
                <button
                    type="button"
                    onClick={toggleLike}
                    className={`mt-1 flex items-center gap-1 text-xs transition-colors ${liked ? "text-pink-400" : "text-text-muted hover:text-pink-400"}`}
                >
                    <svg
                        viewBox="0 0 24 24"
                        fill={liked ? "currentColor" : "none"}
                        stroke="currentColor"
                        strokeWidth="2"
                        className="h-3.5 w-3.5"
                    >
                        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
                    </svg>
                    {likeCount}
                </button>
            </div>
        </div>
    );
}

export default function CommentsPanel({ postId }: { postId: string }) {
    const [comments, setComments] = useState<Comment[] | null>(null);
    const [draft, setDraft] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetch(`${BACKEND_URL}/posts/${postId}/comments`, { credentials: "include" })
            .then((res) => res.json())
            .then((data: { comments: Comment[] }) => setComments(data.comments));
    }, [postId]);

    async function submit() {
        if (!draft.trim()) return;
        setSubmitting(true);
        try {
            const response = await fetch(`${BACKEND_URL}/posts/${postId}/comments`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: draft })
            });
            if (response.ok) {
                const data = (await response.json()) as { comment: Comment };
                setComments((prev) => [data.comment, ...(prev ?? [])]);
                setDraft("");
            }
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="mt-3 border-t border-border pt-2">
            <div className="flex gap-2">
                <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") submit();
                    }}
                    placeholder="Agregá un comentario..."
                    className="flex-1 rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-white placeholder-text-muted outline-none focus:border-primary"
                />
                <button
                    type="button"
                    disabled={submitting || !draft.trim()}
                    onClick={submit}
                    className="rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-black disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Responder
                </button>
            </div>

            {comments === null ? (
                <p className="py-3 text-xs text-text-muted">Cargando comentarios…</p>
            ) : comments.length === 0 ? (
                <p className="py-3 text-xs text-text-muted">Todavía no hay comentarios.</p>
            ) : (
                <div className="divide-y divide-border">
                    {comments.map((comment) => (
                        <CommentRow key={comment.id} comment={comment} />
                    ))}
                </div>
            )}
        </div>
    );
}
