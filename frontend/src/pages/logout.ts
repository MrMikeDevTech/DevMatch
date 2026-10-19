import type { APIRoute } from "astro";
import { backendFetch } from "@/lib/api";

export const POST: APIRoute = async ({ request }) => {
    const backendResponse = await backendFetch(request, "/auth/logout", { method: "POST" });

    const headers = new Headers({ Location: "/login" });
    const setCookie = backendResponse.headers.get("set-cookie");
    if (setCookie) headers.set("set-cookie", setCookie);

    return new Response(null, { status: 302, headers });
};
