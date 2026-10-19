/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare namespace App {
    interface Locals {
        user: {
            id: string;
            username: string;
            fullName: string;
            avatarUrl: string | null;
            onboardingCompleted: boolean;
        } | null;
    }
}
