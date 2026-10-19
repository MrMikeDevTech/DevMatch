import { prisma } from "@/lib/prisma";
import { seedCatalog } from "@/prisma/seed";

const TABLES = [
    "comment_likes",
    "comments",
    "post_likes",
    "reposts",
    "post_attachments",
    "posts",
    "discover_actions",
    "follows",
    "user_looking_for",
    "user_technologies",
    "users",
    "looking_for_options",
    "focus_areas",
    "technologies",
    "roles"
];

async function main() {
    const quoted = TABLES.map((t) => `"${t}"`).join(", ");
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`);
    console.log(`Truncated ${TABLES.length} tables and reset identity sequences.`);

    await seedCatalog();
}

main()
    .then(() => prisma.$disconnect())
    .catch(async (error) => {
        console.error(error);
        await prisma.$disconnect();
        process.exit(1);
    });
