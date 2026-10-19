import { useEffect, useState } from "react";
import PostCard, { type Post } from "@/components/react/PostCard";
import PostComposer from "@/components/react/PostComposer";
import { useNearScreen } from "@/components/react/useNearScreen";

const BACKEND_URL = import.meta.env.PUBLIC_BACKEND_URL ?? "http://localhost:5001";

type Scope = "forYou" | "following";

type Props = {
    initialPosts: Post[];
    initialCursor: string | null;
};

async function fetchFeedPage(scope: Scope, cursor: string | null) {
    const params = new URLSearchParams({ limit: "20", scope });
    if (cursor) params.set("cursor", cursor);
    const response = await fetch(`${BACKEND_URL}/posts/feed?${params.toString()}`, { credentials: "include" });
    return (await response.json()) as { posts: Post[]; nextCursor: string | null };
}

export default function Feed({ initialPosts, initialCursor }: Props) {
    const [scope, setScope] = useState<Scope>("forYou");
    const [posts, setPosts] = useState(initialPosts);
    const [cursor, setCursor] = useState(initialCursor);
    const [loading, setLoading] = useState(false);
    const { ref, isNearScreen } = useNearScreen<HTMLDivElement>();

    useEffect(() => {
        if (!isNearScreen || loading || !cursor) return;

        setLoading(true);
        fetchFeedPage(scope, cursor)
            .then((data) => {
                setPosts((prev) => [...prev, ...data.posts]);
                setCursor(data.nextCursor);
            })
            .finally(() => setLoading(false));
    }, [isNearScreen, loading, cursor, scope]);

    function switchScope(next: Scope) {
        if (next === scope || loading) return;
        setScope(next);
        setPosts([]);
        setCursor(null);
        setLoading(true);
        fetchFeedPage(next, null)
            .then((data) => {
                setPosts(data.posts);
                setCursor(data.nextCursor);
            })
            .finally(() => setLoading(false));
    }

    return (
        <div className="mx-auto max-w-2xl">
            <div className="flex gap-6 border-b border-border px-6 pt-4 text-sm font-semibold">
                {(["forYou", "following"] as const).map((tab) => (
                    <button
                        key={tab}
                        type="button"
                        onClick={() => switchScope(tab)}
                        className={`-mb-px border-b-2 pb-3 transition-colors ${
                            scope === tab ? "border-primary text-white" : "border-transparent text-text-muted hover:text-white"
                        }`}
                    >
                        {tab === "forYou" ? "Para Ti" : "Siguiendo"}
                    </button>
                ))}
            </div>

            <PostComposer onCreated={(post) => setPosts((prev) => [post, ...prev])} />
            {posts.map((post) => (
                <PostCard key={post.id} post={post} />
            ))}
            {cursor && (
                <div ref={ref} className="py-6 text-center text-xs text-text-muted">
                    {loading ? "Cargando más…" : ""}
                </div>
            )}
            {!cursor && posts.length === 0 && !loading && (
                <p className="py-12 text-center text-sm text-text-muted">
                    {scope === "following"
                        ? "Acá van a aparecer los posts de la gente que seguís."
                        : "Todavía no hay posts. ¡Sé el primero en compartir algo!"}
                </p>
            )}
        </div>
    );
}
