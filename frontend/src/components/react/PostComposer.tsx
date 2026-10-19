import { useRef, useState } from "react";
import type { Post } from "@/components/react/PostCard";
import { highlightCode } from "@/lib/highlight";

const BACKEND_URL = import.meta.env.PUBLIC_BACKEND_URL ?? "http://localhost:5001";

type PendingAttachment =
    | { type: "image"; imageUrl: string }
    | { type: "code"; codeContent: string; codeLanguage: string };

export default function PostComposer({ onCreated }: { onCreated: (post: Post) => void }) {
    const [content, setContent] = useState("");
    const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
    const [showCodeField, setShowCodeField] = useState(false);
    const [codeContent, setCodeContent] = useState("");
    const [codeLanguage, setCodeLanguage] = useState("");
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [posting, setPosting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    function addCodeBlock() {
        if (!codeContent.trim()) return;
        setAttachments((prev) => [...prev, { type: "code", codeContent, codeLanguage }]);
        setCodeContent("");
        setCodeLanguage("");
        setShowCodeField(false);
    }

    function removeAttachment(index: number) {
        setAttachments((prev) => prev.filter((_, i) => i !== index));
    }

    async function submit() {
        if (!content.trim()) return;
        setPosting(true);
        try {
            const response = await fetch(`${BACKEND_URL}/posts`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content,
                    attachments: attachments.map((a, orderIndex) => ({ ...a, orderIndex }))
                })
            });
            if (response.ok) {
                const data = (await response.json()) as { post: Post };
                onCreated(data.post);
                setContent("");
                setAttachments([]);
            }
        } finally {
            setPosting(false);
        }
    }

    return (
        <div className="border-b border-border px-6 py-4">
            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="¿Qué estás pensando? (admite markdown)"
                rows={3}
                className="w-full resize-none bg-transparent text-sm text-white placeholder-text-muted outline-none"
            />

            {uploadError && <p className="mt-2 text-xs text-red-400">{uploadError}</p>}

            {attachments.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                    {attachments.map((attachment, index) => (
                        <div key={index} className="relative rounded-lg border border-border bg-bg p-2 text-xs">
                            {attachment.type === "image" ? (
                                <img src={attachment.imageUrl} alt="" className="h-16 w-16 rounded object-cover" />
                            ) : (
                                <span className="text-text-muted">código: {attachment.codeLanguage || "fragmento"}</span>
                            )}
                            <button
                                type="button"
                                onClick={() => removeAttachment(index)}
                                className="absolute -top-2 -right-2 rounded-full bg-surface-hover px-1.5 text-white"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {showCodeField && (
                <div className="mt-2 rounded-lg border border-border bg-bg p-3">
                    <input
                        value={codeLanguage}
                        onChange={(e) => setCodeLanguage(e.target.value)}
                        placeholder="lenguaje (opcional)"
                        className="mb-2 w-full bg-transparent text-xs text-text-muted outline-none"
                    />
                    <textarea
                        value={codeContent}
                        onChange={(e) => setCodeContent(e.target.value)}
                        rows={4}
                        placeholder="pegá tu código..."
                        className="w-full resize-none bg-transparent font-mono text-xs text-white outline-none"
                    />
                    {codeContent.trim() &&
                        (() => {
                            const { html, language } = highlightCode(codeContent, codeLanguage);
                            return (
                                <pre className="mt-2 overflow-x-auto rounded-lg border border-border bg-black/30 p-3 text-xs">
                                    <code
                                        className={`hljs language-${language}`}
                                        dangerouslySetInnerHTML={{ __html: html }}
                                    />
                                </pre>
                            );
                        })()}
                    <button
                        type="button"
                        onClick={addCodeBlock}
                        className="mt-2 rounded bg-surface-hover px-3 py-1 text-xs text-white"
                    >
                        Agregar bloque de código
                    </button>
                </div>
            )}

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
                        onClick={() => setShowCodeField((v) => !v)}
                        className="hover:text-primary"
                        aria-label="Adjuntar código"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                            <polyline points="16 18 22 12 16 6"></polyline>
                            <polyline points="8 6 2 12 8 18"></polyline>
                        </svg>
                    </button>
                </div>
                <button
                    type="button"
                    disabled={posting || !content.trim()}
                    onClick={submit}
                    className="rounded-lg bg-primary px-5 py-1.5 text-sm font-bold text-black disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {posting ? "Publicando…" : "Publicar"}
                </button>
            </div>
        </div>
    );
}
