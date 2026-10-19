import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import MarkdownBody from "@/components/react/MarkdownBody";

const SWIPE_THRESHOLD = 120;
const EXIT_DISTANCE = 600;

const BACKEND_URL = import.meta.env.PUBLIC_BACKEND_URL ?? "http://localhost:5001";

type Technology = { id: number; name: string; type: "language" | "framework" };

type Candidate = {
    id: string;
    username: string;
    fullName: string;
    avatarUrl: string | null;
    bannerUrl: string | null;
    professionalTitle: string | null;
    bioMarkdown: string | null;
    isVerified: boolean;
    technologies: Technology[];
};

async function fetchMore(): Promise<Candidate[]> {
    const response = await fetch(`${BACKEND_URL}/discover/queue?limit=10`, { credentials: "include" });
    if (!response.ok) return [];
    const data = (await response.json()) as { candidates: Candidate[] };
    return data.candidates;
}

export default function DiscoverDeck({ initialQueue }: { initialQueue: Candidate[] }) {
    const [queue, setQueue] = useState(initialQueue);
    const [loading, setLoading] = useState(false);
    const [exhausted, setExhausted] = useState(initialQueue.length === 0);
    const seenIds = useRef(new Set(initialQueue.map((c) => c.id)));
    const current = queue[0];

    const [dragX, setDragX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [exiting, setExiting] = useState<"like" | "pass" | null>(null);
    const dragStartX = useRef(0);

    function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
        if (exiting || loading) return;
        setIsDragging(true);
        dragStartX.current = e.clientX;
        e.currentTarget.setPointerCapture(e.pointerId);
    }

    function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
        if (!isDragging) return;
        setDragX(e.clientX - dragStartX.current);
    }

    function handlePointerUp() {
        if (!isDragging) return;
        setIsDragging(false);

        if (Math.abs(dragX) > SWIPE_THRESHOLD) {
            const direction = dragX > 0 ? "like" : "pass";
            setExiting(direction);
            setDragX(direction === "like" ? EXIT_DISTANCE : -EXIT_DISTANCE);
            setTimeout(() => {
                act(direction);
                setExiting(null);
                setDragX(0);
            }, 220);
        } else {
            setDragX(0);
        }
    }

    async function act(action: "like" | "pass") {
        if (!current || loading) return;
        const target = current;
        const remaining = queue.slice(1);
        setQueue(remaining);
        setLoading(true);

        try {
            await fetch(`${BACKEND_URL}/discover/actions`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ targetUserId: target.id, action })
            });
        } catch {
            // best-effort; the candidate still leaves the local deck either way
        }

        if (remaining.length <= 3) {
            const more = await fetchMore();
            const fresh = more.filter((c) => !seenIds.current.has(c.id));
            fresh.forEach((c) => seenIds.current.add(c.id));
            if (fresh.length === 0 && remaining.length === 0) {
                setExhausted(true);
            } else {
                setQueue((prev) => [...prev, ...fresh]);
            }
        }
        setLoading(false);
    }

    if (!current) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <p className="text-lg font-bold text-white">
                    {exhausted ? "No hay más devs para descubrir por ahora." : "Cargando…"}
                </p>
                {exhausted && <p className="mt-1 text-sm text-text-muted">Volvé más tarde para ver nuevos perfiles.</p>}
            </div>
        );
    }

    return (
        <div className="mx-auto w-full max-w-sm">
            <div
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className="relative overflow-hidden rounded-2xl border border-border bg-surface select-none"
                style={{
                    transform: `translateX(${dragX}px) rotate(${dragX / 20}deg)`,
                    transition: isDragging ? "none" : "transform 0.25s ease",
                    touchAction: "pan-y",
                    cursor: isDragging ? "grabbing" : "grab"
                }}
            >
                {dragX > 20 && (
                    <div
                        className="pointer-events-none absolute top-6 right-6 z-10 rotate-12 rounded-lg border-4 border-green-400 px-3 py-1 text-lg font-black text-green-400"
                        style={{ opacity: Math.min(dragX / SWIPE_THRESHOLD, 1) }}
                    >
                        SEGUIR
                    </div>
                )}
                {dragX < -20 && (
                    <div
                        className="pointer-events-none absolute top-6 left-6 z-10 -rotate-12 rounded-lg border-4 border-red-400 px-3 py-1 text-lg font-black text-red-400"
                        style={{ opacity: Math.min(-dragX / SWIPE_THRESHOLD, 1) }}
                    >
                        PASAR
                    </div>
                )}

                <div className="relative h-28 bg-gradient-to-br from-primary/30 to-surface-hover">
                    {current.bannerUrl && (
                        <img src={current.bannerUrl} alt="" className="h-full w-full object-cover" />
                    )}
                    <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
                        {current.avatarUrl ? (
                            <img
                                src={current.avatarUrl}
                                alt={current.fullName}
                                className="h-20 w-20 rounded-full border-4 border-surface object-cover"
                            />
                        ) : (
                            <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-surface bg-surface-hover text-2xl font-bold text-primary">
                                {current.fullName.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                </div>

                <div className="px-6 pt-12 pb-6 text-center">
                    <p className="flex items-center justify-center gap-1 text-lg font-bold text-white">
                        {current.fullName}
                        {current.isVerified && <span className="text-primary">✓</span>}
                    </p>
                    <p className="text-sm text-text-muted">@{current.username}</p>

                    {current.professionalTitle && (
                        <span className="mt-3 inline-block rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary">
                            {current.professionalTitle}
                        </span>
                    )}

                    {current.technologies.length > 0 && (
                        <div className="mt-3 flex flex-wrap justify-center gap-2">
                            {current.technologies.map((tech) => (
                                <span
                                    key={tech.id}
                                    className="rounded-full bg-surface-hover px-3 py-1 text-xs text-text-muted"
                                >
                                    {tech.name}
                                </span>
                            ))}
                        </div>
                    )}

                    {current.bioMarkdown && (
                        <div className="mt-4 text-left text-sm text-white">
                            <MarkdownBody source={current.bioMarkdown} />
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-center gap-6 border-t border-border py-4">
                    <button
                        type="button"
                        onClick={() => act("pass")}
                        disabled={loading}
                        aria-label="Pasar"
                        className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-hover text-white transition hover:brightness-110 disabled:opacity-40"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                    <button
                        type="button"
                        onClick={() => act("like")}
                        disabled={loading}
                        aria-label="Seguir"
                        className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-black transition hover:brightness-90 disabled:opacity-40"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <line x1="19" y1="8" x2="19" y2="14"></line>
                            <line x1="22" y1="11" x2="16" y2="11"></line>
                        </svg>
                    </button>
                </div>
            </div>
            <p className="mt-4 text-center text-xs text-text-muted">« Deslizá para pasar o seguir »</p>
        </div>
    );
}
