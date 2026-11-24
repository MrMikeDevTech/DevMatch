import { useRef, useState } from "react";
import type { Post } from "@/components/react/PostCard";
import CodeBlockEditor from "@/components/react/CodeBlockEditor";
import ImageLightbox from "@/components/react/ImageLightbox";

const BACKEND_URL = import.meta.env.PUBLIC_BACKEND_URL ?? "http://localhost:5001";
const MAX_CODE_BLOCKS = 5;

type PendingAttachment =
    | { type: "image"; imageUrl: string }
    | { type: "code"; codeContent: string; codeLanguage: string };

type Props = {
    editingPost?: Post;
    onCreated?: (post: Post) => void;
    onUpdated?: (post: Post) => void;
    onCancelEdit?: () => void;
};

function toPendingAttachments(post: Post): PendingAttachment[] {
    return post.attachments
        .slice()
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((a) =>
            a.type === "image"
                ? { type: "image" as const, imageUrl: a.imageUrl ?? "" }
                : { type: "code" as const, codeContent: a.codeContent ?? "", codeLanguage: a.codeLanguage ?? "" }
        );
}

export default function PostComposer({ editingPost, onCreated, onUpdated, onCancelEdit }: Props) {
    const [content, setContent] = useState(editingPost?.content ?? "");
    const [attachments, setAttachments] = useState<PendingAttachment[]>(() =>
        editingPost ? toPendingAttachments(editingPost) : []
    );
    const [codeDraft, setCodeDraft] = useState<{ content: string; language: string } | null>(null);
    const [editingCodeIndex, setEditingCodeIndex] = useState<number | null>(null);
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [posting, setPosting] = useState(false);
    const [postError, setPostError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const codeBlockCount = attachments.filter((a) => a.type === "code").length;
    const atCodeBlockLimit = codeBlockCount >= MAX_CODE_BLOCKS && editingCodeIndex === null;

    async function handleImageSelected(file: File) {
        setUploading(true);
        setUploadError(null);
        try {
            const form = new FormData();
            form.append("image", file);
            const response = await fetch(`${BACKEND_URL}/uploads/post-image`, {
                method: "POST",
                credentials: "include",
                body: form
            });
            if (response.ok) {
                const data = (await response.json()) as { url: string };
                setAttachments((prev) => [...prev, { type: "image", imageUrl: data.url }]);
            } else {
                const data = (await response.json().catch(() => ({}))) as { error?: string };
                setUploadError(data.error ?? "Error al subir el archivo");
            }
        } catch {
            setUploadError("Error al subir el archivo");
        } finally {
            setUploading(false);
        }
    }

    function openNewCodeBlock() {
        if (atCodeBlockLimit) return;
        setEditingCodeIndex(null);
        setCodeDraft({ content: "", language: "" });
    }

    function openEditCodeBlock(index: number) {
        const attachment = attachments[index];
        if (!attachment || attachment.type !== "code") return;
        setEditingCodeIndex(index);
        setCodeDraft({ content: attachment.codeContent, language: attachment.codeLanguage });
    }

    function cancelCodeDraft() {
        setCodeDraft(null);
        setEditingCodeIndex(null);
    }

    function saveCodeDraft() {
        if (!codeDraft || !codeDraft.content.trim()) return;
        if (editingCodeIndex !== null) {
            const index = editingCodeIndex;
            setAttachments((prev) =>
                prev.map((a, i) =>
                    i === index ? { type: "code", codeContent: codeDraft.content, codeLanguage: codeDraft.language } : a
                )
            );
        } else {
            setAttachments((prev) => [
                ...prev,
                { type: "code", codeContent: codeDraft.content, codeLanguage: codeDraft.language }
            ]);
        }
        setCodeDraft(null);
        setEditingCodeIndex(null);
    }

    function removeAttachment(index: number) {
        setAttachments((prev) => prev.filter((_, i) => i !== index));
        if (editingCodeIndex === index) cancelCodeDraft();
    }

    async function submit() {
        if (!content.trim()) return;
        setPosting(true);
        setPostError(null);
        try {
            const url = editingPost ? `${BACKEND_URL}/posts/${editingPost.id}` : `${BACKEND_URL}/posts`;
            const response = await fetch(url, {
                method: editingPost ? "PATCH" : "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content,
                    attachments: attachments.map((a, orderIndex) => ({ ...a, orderIndex }))
                })
            });
            if (response.ok) {
                const data = (await response.json()) as { post: Post };
                if (editingPost) {
                    onUpdated?.(data.post);
                } else {
                    onCreated?.(data.post);
                    setContent("");
                    setAttachments([]);
                }
            } else {
                const data = (await response.json().catch(() => ({}))) as { error?: string };
                setPostError(data.error ?? "No se pudo publicar el post. Intenta de nuevo.");
            }
        } catch {
            setPostError("No se pudo publicar el post. Revisa tu conexión e intenta de nuevo.");
        } finally {
            setPosting(false);
        }
    }

    return (
        <div className={editingPost ? "" : "border-b border-border px-6 py-4"}>
            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="¿Qué estás pensando? (admite markdown)"
                rows={3}
                className="w-full resize-none bg-transparent text-sm text-white placeholder-text-muted outline-none"
            />

            {uploadError && <p className="mt-2 text-xs text-red-400">{uploadError}</p>}
            {postError && <p className="mt-2 text-xs text-red-400">{postError}</p>}

            {attachments.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-3">
                    {attachments.map((attachment, index) => (
                        <div key={index} className="group relative">
                            {attachment.type === "image" ? (
                                <button
                                    type="button"
                                    onClick={() => setPreviewImageUrl(attachment.imageUrl)}
                                    className="block overflow-hidden rounded-lg border border-border"
                                >
                                    <img src={attachment.imageUrl} alt="" className="h-16 w-16 object-cover" />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => openEditCodeBlock(index)}
                                    className={`flex h-16 min-w-[7rem] items-center gap-2 rounded-lg border px-3 text-xs transition-colors ${
                                        editingCodeIndex === index
                                            ? "border-primary text-primary"
                                            : "border-border text-text-muted hover:border-primary hover:text-white"
                                    }`}
                                >
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        className="h-4 w-4 shrink-0"
                                    >
                                        <polyline points="16 18 22 12 16 6"></polyline>
                                        <polyline points="8 6 2 12 8 18"></polyline>
                                    </svg>
                                    <span className="truncate">{attachment.codeLanguage || "código"}</span>
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => removeAttachment(index)}
                                aria-label="Quitar adjunto"
                                className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-surface-hover text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {codeDraft && (
                <div className="mt-2 space-y-2">
                    <CodeBlockEditor
                        content={codeDraft.content}
                        language={codeDraft.language}
                        onContentChange={(value) => setCodeDraft((d) => (d ? { ...d, content: value } : d))}
                        onLanguageChange={(value) => setCodeDraft((d) => (d ? { ...d, language: value } : d))}
                    />
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={saveCodeDraft}
                            disabled={!codeDraft.content.trim()}
                            className="rounded bg-surface-hover px-3 py-1 text-xs text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {editingCodeIndex !== null ? "Guardar bloque" : "Agregar bloque de código"}
                        </button>
                        <button
                            type="button"
                            onClick={cancelCodeDraft}
                            className="rounded px-3 py-1 text-xs text-text-muted hover:text-white"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {previewImageUrl && <ImageLightbox src={previewImageUrl} onClose={() => setPreviewImageUrl(null)} />}

            <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-3 text-text-muted">
                    <button
                        type="button"
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                        className="hover:text-primary disabled:opacity-40"
                        aria-label="Adjuntar imagen"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                            <rect x="3" y="3" width="18" height="18" rx="2"></rect>
                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageSelected(file);
                            e.target.value = "";
                        }}
                    />
                    <button
                        type="button"
                        disabled={atCodeBlockLimit}
                        onClick={() => (codeDraft ? cancelCodeDraft() : openNewCodeBlock())}
                        className={`disabled:cursor-not-allowed disabled:opacity-40 ${codeDraft ? "text-primary" : "hover:text-primary"}`}
                        aria-label="Adjuntar código"
                        title={atCodeBlockLimit ? `Máximo ${MAX_CODE_BLOCKS} bloques de código` : undefined}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                            <polyline points="16 18 22 12 16 6"></polyline>
                            <polyline points="8 6 2 12 8 18"></polyline>
                        </svg>
                    </button>
                    {codeBlockCount > 0 && (
                        <span className="text-xs">
                            {codeBlockCount}/{MAX_CODE_BLOCKS} bloques
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {editingPost && (
                        <button
                            type="button"
                            onClick={onCancelEdit}
                            className="rounded-lg px-4 py-1.5 text-sm font-medium text-text-muted hover:text-white"
                        >
                            Cancelar
                        </button>
                    )}
                    <button
                        type="button"
                        disabled={posting || !content.trim() || Boolean(codeDraft)}
                        onClick={submit}
                        title={codeDraft ? "Guarda o cancela el bloque de código antes de publicar" : undefined}
                        className="rounded-lg bg-primary px-5 py-1.5 text-sm font-bold text-black disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {posting ? "Guardando…" : editingPost ? "Guardar cambios" : "Publicar"}
                    </button>
                </div>
            </div>
        </div>
    );
}
