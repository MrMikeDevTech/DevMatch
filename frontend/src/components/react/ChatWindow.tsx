import { useEffect, useRef, useState } from "react";
import MessageBubble from "@/components/react/MessageBubble";
import { highlightCode } from "@/lib/highlight";

const BACKEND_URL = import.meta.env.PUBLIC_BACKEND_URL ?? "http://localhost:5001";
const WS_URL = `${BACKEND_URL.replace(/^http/, "ws")}/ws`;

type Message = {
    id: string;
    conversationId: string;
    content: string | null;
    imageUrl: string | null;
    codeContent: string | null;
    codeLanguage: string | null;
    createdAt: string;
    sender: { id: string; username: string; fullName: string; avatarUrl: string | null };
};

type OtherUser = { id: string; username: string; fullName: string; avatarUrl: string | null };

type Props = {
    conversationId: string;
    otherUser: OtherUser;
    currentUserId: string;
    initialMessages: Message[];
};

export default function ChatWindow({ conversationId, otherUser, currentUserId, initialMessages }: Props) {
    const [messages, setMessages] = useState(initialMessages);
    const [draft, setDraft] = useState("");
    const [connected, setConnected] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
    const [showCodeField, setShowCodeField] = useState(false);
    const [codeContent, setCodeContent] = useState("");
    const [codeLanguage, setCodeLanguage] = useState("");
    const wsRef = useRef<WebSocket | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const attemptsRef = useRef(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        let cancelled = false;
        let socket: WebSocket;

        function connect() {
            if (cancelled) return;
            socket = new WebSocket(WS_URL);
            wsRef.current = socket;

            socket.onopen = () => {
                attemptsRef.current = 0;
                setConnected(true);
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data) as { type: string; conversationId: string; message: Message };
                    if (data.type === "message" && data.conversationId === conversationId) {
                        setMessages((prev) => [...prev, data.message]);
                    }
                } catch {
                    // ignore malformed frames
                }
            };

            socket.onclose = () => {
                setConnected(false);
                if (cancelled) return;
                const delay = Math.min(1000 * 2 ** attemptsRef.current, 8000);
                attemptsRef.current += 1;
                setTimeout(connect, delay);
            };
        }

        connect();
        return () => {
            cancelled = true;
            wsRef.current?.close();
        };
    }, [conversationId]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages.length]);

    async function handleImageSelected(file: File) {
        setUploading(true);
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
                setPendingImageUrl(data.url);
            }
        } finally {
            setUploading(false);
        }
    }

    function send() {
        const content = draft.trim();
        const hasCode = showCodeField && codeContent.trim();
        if (!content && !pendingImageUrl && !hasCode) return;
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        wsRef.current.send(
            JSON.stringify({
                type: "send",
                to: otherUser.username,
                content: content || undefined,
                imageUrl: pendingImageUrl || undefined,
                codeContent: hasCode ? codeContent.trim() : undefined,
                codeLanguage: hasCode ? codeLanguage.trim() || undefined : undefined
            })
        );

        setDraft("");
        setPendingImageUrl(null);
        setCodeContent("");
        setCodeLanguage("");
        setShowCodeField(false);
    }

    return (
        <div className="flex h-full flex-1 flex-col">
            <div className="flex items-center gap-3 border-b border-border px-6 py-4">
                {otherUser.avatarUrl ? (
                    <img src={otherUser.avatarUrl} alt={otherUser.fullName} className="h-10 w-10 rounded-full" />
                ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-hover font-bold text-primary">
                        {otherUser.fullName.charAt(0).toUpperCase()}
                    </div>
                )}
                <div>
                    <a href={`/profile/${otherUser.username}`} className="font-bold text-white hover:underline">
                        {otherUser.fullName}
                    </a>
                    <p className="text-xs text-text-muted">
                        @{otherUser.username} · {connected ? "Conectado" : "Reconectando…"}
                    </p>
                </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
                {messages.length === 0 && (
                    <p className="py-12 text-center text-sm text-text-muted">
                        Todavía no hay mensajes. ¡Saludá a {otherUser.fullName.split(" ")[0]}!
                    </p>
                )}
                {messages.map((message) => (
                    <MessageBubble key={message.id} message={message} isMine={message.sender.id === currentUserId} />
                ))}
                <div ref={bottomRef} />
            </div>

            <div className="border-t border-border px-6 py-4">
                {pendingImageUrl && (
                    <div className="relative mb-2 inline-block">
                        <img src={pendingImageUrl} alt="" className="h-20 w-20 rounded-lg object-cover" />
                        <button
                            type="button"
                            onClick={() => setPendingImageUrl(null)}
                            className="absolute -top-2 -right-2 rounded-full bg-surface-hover px-1.5 text-white"
                        >
                            ×
                        </button>
                    </div>
                )}

                {showCodeField && (
                    <div className="mb-2 rounded-lg border border-border bg-bg p-3">
                        <input
                            value={codeLanguage}
                            onChange={(e) => setCodeLanguage(e.target.value)}
                            placeholder="lenguaje (opcional)"
                            className="mb-2 w-full bg-transparent text-xs text-text-muted outline-none"
                        />
                        <textarea
                            value={codeContent}
                            onChange={(e) => setCodeContent(e.target.value)}
                            rows={3}
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
                    </div>
                )}

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                        className="shrink-0 text-text-muted hover:text-primary disabled:opacity-40"
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
                        className="shrink-0 text-text-muted hover:text-primary"
                        aria-label="Adjuntar código"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                            <polyline points="16 18 22 12 16 6"></polyline>
                            <polyline points="8 6 2 12 8 18"></polyline>
                        </svg>
                    </button>
                    <input
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") send();
                        }}
                        placeholder="Escribí un mensaje..."
                        className="flex-1 rounded-lg border border-border bg-bg px-4 py-2 text-sm text-white placeholder-text-muted outline-none focus:border-primary"
                    />
                    <button
                        type="button"
                        disabled={(!draft.trim() && !pendingImageUrl && !codeContent.trim()) || !connected}
                        onClick={send}
                        className="shrink-0 rounded-lg bg-primary px-5 py-2 text-sm font-bold text-black disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        Enviar
                    </button>
                </div>
            </div>
        </div>
    );
}
