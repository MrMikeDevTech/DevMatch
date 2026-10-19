import { useState } from "react";
import MarkdownBody from "@/components/react/MarkdownBody";

export default function MarkdownField({
    label,
    value,
    onChange
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
}) {
    const [mode, setMode] = useState<"write" | "preview">("write");

    return (
        <div>
            <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-white">{label}</p>
                <div className="flex gap-1 text-xs">
                    <button
                        type="button"
                        onClick={() => setMode("write")}
                        className={`rounded px-2 py-1 ${mode === "write" ? "bg-surface-hover text-white" : "text-text-muted"}`}
                    >
                        Escribir
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode("preview")}
                        className={`rounded px-2 py-1 ${mode === "preview" ? "bg-surface-hover text-white" : "text-text-muted"}`}
                    >
                        Vista previa
                    </button>
                </div>
            </div>

            {mode === "write" ? (
                <textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    rows={8}
                    placeholder="Admite markdown — encabezados, listas, bloques de código..."
                    className="w-full resize-none rounded-lg border border-border bg-bg px-3 py-2 font-mono text-sm text-white placeholder-text-muted outline-none focus:border-primary"
                />
            ) : (
                <div className="min-h-[10rem] rounded-lg border border-border bg-bg px-3 py-2">
                    {value.trim() ? (
                        <MarkdownBody source={value} />
                    ) : (
                        <p className="text-sm text-text-muted">Todavía no hay nada para mostrar.</p>
                    )}
                </div>
            )}
        </div>
    );
}
