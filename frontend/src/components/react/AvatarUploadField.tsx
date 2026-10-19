import { useRef, useState } from "react";

const BACKEND_URL = import.meta.env.PUBLIC_BACKEND_URL ?? "http://localhost:5001";

export default function AvatarUploadField({
    value,
    onChange
}: {
    value: string | null;
    onChange: (url: string) => void;
}) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    async function handleSelect(file: File) {
        setUploading(true);
        setError(null);
        try {
            const form = new FormData();
            form.append("image", file);
            const response = await fetch(`${BACKEND_URL}/uploads/avatar`, {
                method: "POST",
                credentials: "include",
                body: form
            });
            if (response.ok) {
                const data = (await response.json()) as { url: string };
                onChange(data.url);
            } else {
                const data = (await response.json().catch(() => ({}))) as { error?: string };
                setError(data.error ?? "Error al subir el archivo");
            }
        } catch {
            setError("Error al subir el archivo");
        } finally {
            setUploading(false);
        }
    }

    return (
        <div>
            <div className="flex items-center gap-4">
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-border bg-surface-hover"
                >
                    {value ? (
                        <img src={value} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                        <span className="flex h-full w-full items-center justify-center text-xs text-text-muted">
                            Sin foto
                        </span>
                    )}
                    {uploading && (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-xs text-white">
                            Subiendo…
                        </span>
                    )}
                </button>
                <div>
                    <p className="text-sm font-semibold text-white">Avatar</p>
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs text-primary hover:underline"
                    >
                        Cambiar foto
                    </button>
                </div>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleSelect(file);
                        e.target.value = "";
                    }}
                />
            </div>
            {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
        </div>
    );
}
