const BACKEND_URL = import.meta.env.BACKEND_URL ?? "http://localhost:5001";

export async function backendFetch(request: Request, path: string, init: RequestInit = {}): Promise<Response> {
    const cookie = request.headers.get("cookie") ?? "";
    return fetch(`${BACKEND_URL}${path}`, {
        ...init,
        headers: {
            ...(cookie ? { cookie } : {}),
            ...init.headers
        }
    });
}

export async function backendJson<T>(request: Request, path: string, init: RequestInit = {}): Promise<T | null> {
    const response = await backendFetch(request, path, init);
    if (!response.ok) return null;
    return (await response.json()) as T;
}
