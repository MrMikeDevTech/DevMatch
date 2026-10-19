import { defineMiddleware } from "astro:middleware";
import { backendJson } from "@/lib/api";

export type SessionUser = {
    id: string;
    username: string;
    fullName: string;
    avatarUrl: string | null;
    onboardingCompleted: boolean;
};

const PUBLIC_PATHS = new Set(["/login", "/logout"]);

export const onRequest = defineMiddleware(async (context, next) => {
    const data = await backendJson<{ user: SessionUser | null }>(context.request, "/auth/session");
    const user = data?.user ?? null;
    const path = context.url.pathname;

    if (!user) {
        if (!PUBLIC_PATHS.has(path)) {
            return context.redirect("/login");
        }
        context.locals.user = null;
        return next();
    }

    if (path === "/login") {
        return context.redirect("/");
    }

    if (!user.onboardingCompleted && path !== "/onboarding" && path !== "/logout") {
        return context.redirect("/onboarding");
    }

    if (user.onboardingCompleted && path === "/onboarding") {
        return context.redirect("/");
    }

    context.locals.user = user;
    return next();
});
