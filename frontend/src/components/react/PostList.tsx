import PostCard, { type Post } from "@/components/react/PostCard";

export default function PostList({ posts }: { posts: Post[] }) {
    if (posts.length === 0) {
        return <p className="py-12 text-center text-sm text-text-muted">Todavía no hay posts.</p>;
    }

    return (
        <div>
            {posts.map((post) => (
                <PostCard key={post.id} post={post} />
            ))}
        </div>
    );
}
