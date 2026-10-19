import type { UserModel } from "@/lib/generated/prisma/models";

declare global {
    namespace Express {
        interface Request {
            user?: UserModel;
        }
    }
}

export {};
