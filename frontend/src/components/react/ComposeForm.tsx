import PostComposer from "@/components/react/PostComposer";

export default function ComposeForm() {
    return (
        <PostComposer
            onCreated={() => {
                window.location.href = "/";
            }}
        />
    );
}
