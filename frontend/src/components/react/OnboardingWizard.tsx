import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

const BACKEND_URL = import.meta.env.PUBLIC_BACKEND_URL ?? "http://localhost:5001";

type FocusArea = { id: number; name: string };
type Technology = { id: number; name: string; type: "language" | "framework" };

type Props = {
    focusAreas: FocusArea[];
    initialUsername: string;
    initialFullName: string;
    avatarUrl: string | null;
};

function useDebounced<T>(value: T, delayMs: number): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delayMs);
        return () => clearTimeout(timer);
    }, [value, delayMs]);
    return debounced;
}

function TechSearchField({
    label,
    type,
    selected,
    onChange
}: {
    label: string;
    type: "language" | "framework";
    selected: Technology[];
    onChange: Dispatch<SetStateAction<Technology[]>>;
}) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Technology[]>([]);
    const [open, setOpen] = useState(false);
    const debouncedQuery = useDebounced(query, 250);
    const blurTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

    useEffect(() => {
        const controller = new AbortController();
        const params = new URLSearchParams({ type });
        if (debouncedQuery) params.set("q", debouncedQuery);
        fetch(`${BACKEND_URL}/catalog/technologies?${params.toString()}`, {
            credentials: "include",
            signal: controller.signal
        })
            .then((res) => res.json())
            .then((data: { technologies: Technology[] }) => setResults(data.technologies))
            .catch(() => {});
        return () => controller.abort();
    }, [debouncedQuery, type]);

    function add(tech: Technology) {
        if (selected.some((t) => t.id === tech.id)) return;
        onChange([...selected, tech]);
        setQuery("");
    }

    function handleFocus() {
        clearTimeout(blurTimer.current);
        setOpen(true);
    }

    function handleBlur() {
        blurTimer.current = setTimeout(() => setOpen(false), 150);
    }

    function remove(id: number) {
        onChange(selected.filter((t) => t.id !== id));
    }

    return (
        <div>
            <label className="mb-2 block text-sm font-semibold text-white">{label}</label>
            <div className="relative">
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    placeholder={`Buscar ${label.toLowerCase()}...`}
                    className="w-full rounded-lg border border-border bg-bg px-4 py-2 text-sm text-white placeholder-text-muted outline-none focus:border-primary"
                />
                {open && results.length > 0 && (
                    <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-surface shadow-lg">
                        {results.map((tech) => (
                            <button
                                type="button"
                                key={tech.id}
                                onClick={() => add(tech)}
                                className="block w-full px-4 py-2 text-left text-sm text-white hover:bg-surface-hover"
                            >
                                {tech.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
                {selected.map((tech) => (
                    <span
                        key={tech.id}
                        className="flex items-center gap-1 rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary"
                    >
                        {tech.name}
                        <button type="button" onClick={() => remove(tech.id)} aria-label={`Quitar ${tech.name}`}>
                            ×
                        </button>
                    </span>
                ))}
            </div>
        </div>
    );
}

export default function OnboardingWizard({ focusAreas, initialUsername, initialFullName, avatarUrl }: Props) {
    const [step, setStep] = useState(1);
    const [username, setUsername] = useState(initialUsername);
    const [fullName, setFullName] = useState(initialFullName);
    const [focusId, setFocusId] = useState<number | null>(null);
    const [languages, setLanguages] = useState<Technology[]>([]);
    const [frameworks, setFrameworks] = useState<Technology[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(true);
    const debouncedUsername = useDebounced(username, 300);
    const checkId = useRef(0);

    useEffect(() => {
        if (debouncedUsername === initialUsername) {
            setUsernameAvailable(true);
            return;
        }
        const id = ++checkId.current;
        fetch(`${BACKEND_URL}/users/check-username?value=${encodeURIComponent(debouncedUsername)}`, {
            credentials: "include"
        })
            .then((res) => res.json())
            .then((data: { available: boolean }) => {
                if (checkId.current === id) setUsernameAvailable(data.available);
            })
            .catch(() => {});
    }, [debouncedUsername, initialUsername]);

    const usernameValid = /^[a-z0-9_]{3,30}$/.test(username);
    const canProceedStep1 = usernameValid && usernameAvailable === true && fullName.trim().length > 0;
    const canProceedStep2 = focusId !== null;

    async function submit() {
        setSubmitting(true);
        setError(null);
        try {
            const response = await fetch(`${BACKEND_URL}/users/me`, {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username,
                    fullName,
                    focusId,
                    technologyIds: [...languages, ...frameworks].map((t) => t.id),
                    onboardingCompleted: true
                })
            });
            if (!response.ok) {
                const data = (await response.json().catch(() => ({}))) as { error?: string };
                setError(data.error ?? "Algo salió mal");
                setSubmitting(false);
                return;
            }
            window.location.href = "/";
        } catch {
            setError("Error de red, intentá de nuevo");
            setSubmitting(false);
        }
    }

    const focusAreaName = focusAreas.find((f) => f.id === focusId)?.name ?? "";

    return (
        <div className="mx-auto w-full max-w-xl">
            <p className="mb-2 text-center text-xs font-semibold tracking-wide text-primary uppercase">
                Paso {step} de 4
            </p>

            {step === 1 && (
                <div>
                    <h1 className="text-center text-2xl font-bold text-white">Datos básicos</h1>
                    <div className="mt-8 flex justify-center">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt={fullName} className="h-24 w-24 rounded-full object-cover" />
                        ) : (
                            <div className="h-24 w-24 rounded-full bg-surface-hover" />
                        )}
                    </div>
                    <div className="mt-8 flex flex-col gap-4">
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-white">Nombre de usuario</label>
                            <div className="flex items-center gap-2">
                                <span className="text-text-muted">@</span>
                                <input
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value.toLowerCase())}
                                    className="w-full rounded-lg border border-border bg-bg px-4 py-2 text-sm text-white outline-none focus:border-primary"
                                />
                                {usernameValid && usernameAvailable === true && (
                                    <span className="text-green-400">✓</span>
                                )}
                                {usernameValid && usernameAvailable === false && (
                                    <span className="text-red-400">✕</span>
                                )}
                            </div>
                            <p className="mt-1 text-xs text-text-muted">
                                Este será tu nombre de usuario único en DevMatch.
                            </p>
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-white">Nombre completo</label>
                            <input
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full rounded-lg border border-border bg-bg px-4 py-2 text-sm text-white outline-none focus:border-primary"
                            />
                        </div>
                    </div>
                    <div className="mt-8 flex justify-end">
                        <button
                            type="button"
                            disabled={!canProceedStep1}
                            onClick={() => setStep(2)}
                            className="rounded-lg bg-primary px-6 py-2 font-bold text-black disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Siguiente →
                        </button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div>
                    <h1 className="text-2xl font-bold text-white">¿Cuál es tu rol?</h1>
                    <p className="mt-1 text-sm text-text-muted">
                        Elegí tu enfoque principal para ayudarnos a conectarte con la gente indicada
                    </p>
                    <div className="mt-6 grid grid-cols-2 gap-3">
                        {focusAreas.map((area) => (
                            <button
                                type="button"
                                key={area.id}
                                onClick={() => setFocusId(area.id)}
                                className={`rounded-lg border px-4 py-6 text-center text-sm font-medium transition-colors ${
                                    focusId === area.id
                                        ? "border-primary bg-primary/10 text-primary"
                                        : "border-border text-text-muted hover:bg-surface-hover"
                                }`}
                            >
                                {area.name}
                            </button>
                        ))}
                    </div>
                    <div className="mt-8 flex justify-between">
                        <button type="button" onClick={() => setStep(1)} className="text-sm text-text-muted">
                            ← Atrás
                        </button>
                        <button
                            type="button"
                            disabled={!canProceedStep2}
                            onClick={() => setStep(3)}
                            className="rounded-lg bg-primary px-6 py-2 font-bold text-black disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Siguiente →
                        </button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div>
                    <h1 className="text-2xl font-bold text-white">¿Con qué programás?</h1>
                    <p className="mt-1 text-sm text-text-muted">
                        Armá tu stack para que podamos conectarte con gente y proyectos afines a tu experiencia.
                    </p>
                    <div className="mt-6 flex flex-col gap-6">
                        <TechSearchField
                            label="Lenguajes preferidos"
                            type="language"
                            selected={languages}
                            onChange={setLanguages}
                        />
                        <TechSearchField
                            label="Frameworks preferidos"
                            type="framework"
                            selected={frameworks}
                            onChange={setFrameworks}
                        />
                    </div>
                    <div className="mt-8 flex justify-between">
                        <button type="button" onClick={() => setStep(2)} className="text-sm text-text-muted">
                            ← Atrás
                        </button>
                        <button
                            type="button"
                            onClick={() => setStep(4)}
                            className="rounded-lg bg-primary px-6 py-2 font-bold text-black"
                        >
                            Siguiente →
                        </button>
                    </div>
                </div>
            )}

            {step === 4 && (
                <div>
                    <h1 className="text-center text-2xl font-bold text-white">Confirmá tus datos</h1>
                    <p className="mt-1 text-center text-sm text-text-muted">
                        Revisá la vista previa de tu perfil antes de terminar.
                    </p>
                    <div className="mt-6 rounded-xl border border-border bg-surface p-6">
                        <div className="flex items-center gap-4">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt={fullName} className="h-16 w-16 rounded-full object-cover" />
                            ) : (
                                <div className="h-16 w-16 rounded-full bg-surface-hover" />
                            )}
                            <div>
                                <p className="text-lg font-bold text-white">{fullName}</p>
                                <p className="text-sm text-text-muted">@{username}</p>
                                <p className="text-sm text-text-muted">{focusAreaName}</p>
                            </div>
                        </div>
                        {(languages.length > 0 || frameworks.length > 0) && (
                            <div className="mt-4">
                                <p className="text-xs font-semibold tracking-wide text-text-muted uppercase">
                                    Stack principal
                                </p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {[...languages, ...frameworks].map((tech) => (
                                        <span
                                            key={tech.id}
                                            className="rounded-full bg-surface-hover px-3 py-1 text-xs text-text-muted"
                                        >
                                            {tech.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
                    <div className="mt-8 flex justify-between">
                        <button type="button" onClick={() => setStep(3)} className="text-sm text-text-muted">
                            ← Atrás
                        </button>
                        <button
                            type="button"
                            disabled={submitting}
                            onClick={submit}
                            className="rounded-lg bg-primary px-6 py-2 font-bold text-black disabled:opacity-40"
                        >
                            {submitting ? "Guardando…" : "Confirmar y terminar ✓"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
