import { useState } from "react";
import AvatarUploadField from "@/components/react/AvatarUploadField";
import BannerUploadField from "@/components/react/BannerUploadField";
import MarkdownField from "@/components/react/MarkdownField";

const BACKEND_URL = import.meta.env.PUBLIC_BACKEND_URL ?? "http://localhost:5001";

type Props = {
    username: string;
    avatarUrl: string | null;
    bannerUrl: string | null;
    fullName: string;
    professionalTitle: string | null;
    bioMarkdown: string | null;
};

export default function EditProfileForm({
    username,
    avatarUrl: initialAvatarUrl,
    bannerUrl: initialBannerUrl,
    fullName: initialFullName,
    professionalTitle: initialProfessionalTitle,
    bioMarkdown: initialBioMarkdown
}: Props) {
    const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
    const [bannerUrl, setBannerUrl] = useState(initialBannerUrl);
    const [fullName, setFullName] = useState(initialFullName);
    const [professionalTitle, setProfessionalTitle] = useState(initialProfessionalTitle ?? "");
    const [bioMarkdown, setBioMarkdown] = useState(initialBioMarkdown ?? "");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function save() {
        setSaving(true);
        setError(null);
        try {
            const response = await fetch(`${BACKEND_URL}/users/me`, {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ avatarUrl, bannerUrl, fullName, professionalTitle, bioMarkdown })
            });
            if (!response.ok) {
                const data = (await response.json().catch(() => ({}))) as { error?: string };
                setError(data.error ?? "Algo salió mal");
                return;
            }
            window.location.href = `/profile/${username}`;
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="mx-auto max-w-xl">
            <BannerUploadField value={bannerUrl} onChange={setBannerUrl} />
            <div className="mt-6">
                <AvatarUploadField value={avatarUrl} onChange={setAvatarUrl} />
            </div>

            <div className="mt-6">
                <label className="mb-2 block text-sm font-semibold text-white">Nombre completo</label>
                <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-white outline-none focus:border-primary"
                />
            </div>

            <div className="mt-4">
                <label className="mb-2 block text-sm font-semibold text-white">Título profesional</label>
                <input
                    value={professionalTitle}
                    onChange={(e) => setProfessionalTitle(e.target.value)}
                    placeholder="ej. Desarrollador Full-Stack"
                    className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-white placeholder-text-muted outline-none focus:border-primary"
                />
            </div>

            <div className="mt-4">
                <MarkdownField label="Biografía" value={bioMarkdown} onChange={setBioMarkdown} />
            </div>

            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

            <div className="mt-6 flex justify-end">
                <button
                    type="button"
                    disabled={saving}
                    onClick={save}
                    className="rounded-lg bg-primary px-6 py-2 text-sm font-bold text-black disabled:opacity-40"
                >
                    {saving ? "Guardando…" : "Guardar"}
                </button>
            </div>
        </div>
    );
}
