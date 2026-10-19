import { highlightCode } from "@/lib/highlight";

type Message = {
    id: string;
    content: string | null;
    imageUrl: string | null;
    codeContent: string | null;
    codeLanguage: string | null;
    createdAt: string;
};

function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function MessageBubble({ message, isMine }: { message: Message; isMine: boolean }) {
    const code = message.codeContent ? highlightCode(message.codeContent, message.codeLanguage ?? undefined) : null;

    return (
        <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
            <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                    isMine ? "bg-primary text-black" : "bg-surface-hover text-white"
                }`}
            >
                {message.imageUrl && (
                    <img src={message.imageUrl} alt="" className="mb-1 max-h-64 rounded-lg object-cover" />
                )}
                {code && (
                    <pre className="mb-1 overflow-x-auto rounded-lg border border-border bg-black/30 p-3 text-xs">
                        <code
                            className={`hljs language-${code.language}`}
                            dangerouslySetInnerHTML={{ __html: code.html }}
                        />
                    </pre>
                )}
                {message.content && <p className="whitespace-pre-wrap break-words">{message.content}</p>}
                <p className={`mt-1 text-[10px] ${isMine ? "text-black/60" : "text-text-muted"}`}>
                    {formatTime(message.createdAt)}
                </p>
            </div>
        </div>
    );
}
