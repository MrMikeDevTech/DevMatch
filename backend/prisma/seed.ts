import { prisma } from "@/lib/prisma";

const FOCUS_AREAS = [
    "Frontend",
    "Backend",
    "Full-stack",
    "Mobile",
    "DevOps",
    "Data/AI",
    "UI/UX Designer",
    "QA/Testing"
];

export const TECHNOLOGIES: Array<{ name: string; type: "language" | "framework" }> = [
    // ---------- Lenguajes ----------
    { name: "JavaScript", type: "language" },
    { name: "TypeScript", type: "language" },
    { name: "Python", type: "language" },
    { name: "Go", type: "language" },
    { name: "Java", type: "language" },
    { name: "C", type: "language" },
    { name: "C++", type: "language" },
    { name: "Rust", type: "language" },
    { name: "HTML", type: "language" },
    { name: "CSS", type: "language" },
    { name: "Lua", type: "language" },
    { name: "Markdown", type: "language" },
    { name: "C#", type: "language" },
    { name: "PHP", type: "language" },
    { name: "Ruby", type: "language" },
    { name: "Swift", type: "language" },
    { name: "Kotlin", type: "language" },
    { name: "Dart", type: "language" },
    { name: "Scala", type: "language" },
    { name: "Elixir", type: "language" },
    { name: "Erlang", type: "language" },
    { name: "Haskell", type: "language" },
    { name: "OCaml", type: "language" },
    { name: "F#", type: "language" },
    { name: "Clojure", type: "language" },
    { name: "Groovy", type: "language" },
    { name: "Objective-C", type: "language" },
    { name: "R", type: "language" },
    { name: "Julia", type: "language" },
    { name: "MATLAB", type: "language" },
    { name: "SQL", type: "language" },
    { name: "GraphQL", type: "language" },
    { name: "Bash", type: "language" },
    { name: "PowerShell", type: "language" },
    { name: "Perl", type: "language" },
    { name: "Zig", type: "language" },
    { name: "Nim", type: "language" },
    { name: "Elm", type: "language" },
    { name: "Solidity", type: "language" },
    { name: "Assembly", type: "language" },
    { name: "Fortran", type: "language" },
    { name: "COBOL", type: "language" },
    { name: "Lisp", type: "language" },
    { name: "Racket", type: "language" },
    { name: "Nix", type: "language" },
    { name: "SCSS", type: "language" },
    { name: "Verilog", type: "language" },
    { name: "VHDL", type: "language" },

    // ---------- Frameworks y librerías: frontend ----------
    { name: "React", type: "framework" },
    { name: "Vue", type: "framework" },
    { name: "Astro", type: "framework" },
    { name: "Angular", type: "framework" },
    { name: "Svelte", type: "framework" },
    { name: "SvelteKit", type: "framework" },
    { name: "Next.js", type: "framework" },
    { name: "Nuxt", type: "framework" },
    { name: "Remix", type: "framework" },
    { name: "SolidJS", type: "framework" },
    { name: "Qwik", type: "framework" },
    { name: "Preact", type: "framework" },
    { name: "Alpine.js", type: "framework" },
    { name: "htmx", type: "framework" },
    { name: "jQuery", type: "framework" },
    { name: "Tailwind CSS", type: "framework" },
    { name: "Bootstrap", type: "framework" },
    { name: "Material UI", type: "framework" },
    { name: "Chakra UI", type: "framework" },
    { name: "shadcn/ui", type: "framework" },
    { name: "Redux", type: "framework" },
    { name: "Zustand", type: "framework" },
    { name: "TanStack Query", type: "framework" },
    { name: "Three.js", type: "framework" },

    // ---------- Frameworks: backend ----------
    { name: "Node.js", type: "framework" },
    { name: "Deno", type: "framework" },
    { name: "Bun", type: "framework" },
    { name: "Express", type: "framework" },
    { name: "NestJS", type: "framework" },
    { name: "Fastify", type: "framework" },
    { name: "Hono", type: "framework" },
    { name: "Koa", type: "framework" },
    { name: "tRPC", type: "framework" },
    { name: "Socket.IO", type: "framework" },
    { name: "Django", type: "framework" },
    { name: "Flask", type: "framework" },
    { name: "FastAPI", type: "framework" },
    { name: "Spring Boot", type: "framework" },
    { name: "Laravel", type: "framework" },
    { name: "Symfony", type: "framework" },
    { name: "Ruby on Rails", type: "framework" },
    { name: "Sinatra", type: "framework" },
    { name: "ASP.NET Core", type: "framework" },
    { name: "Gin", type: "framework" },
    { name: "Echo", type: "framework" },
    { name: "Fiber", type: "framework" },
    { name: "Actix", type: "framework" },
    { name: "Axum", type: "framework" },
    { name: "Rocket", type: "framework" },
    { name: "Phoenix", type: "framework" },
    { name: "Ktor", type: "framework" },
    { name: "Prisma", type: "framework" },
    { name: "Drizzle", type: "framework" },
    { name: "SQLAlchemy", type: "framework" },
    { name: "Hibernate", type: "framework" },

    // ---------- Frameworks: mobile y escritorio ----------
    { name: "Flutter", type: "framework" },
    { name: "React Native", type: "framework" },
    { name: "Expo", type: "framework" },
    { name: "SwiftUI", type: "framework" },
    { name: "Jetpack Compose", type: "framework" },
    { name: "Ionic", type: "framework" },
    { name: "Electron", type: "framework" },
    { name: "Tauri", type: "framework" },
    { name: "Qt", type: "framework" },
    { name: "Xamarin", type: "framework" },
    { name: ".NET MAUI", type: "framework" },

    // ---------- Frameworks: datos, IA y ML ----------
    { name: "TensorFlow", type: "framework" },
    { name: "PyTorch", type: "framework" },
    { name: "Keras", type: "framework" },
    { name: "scikit-learn", type: "framework" },
    { name: "Pandas", type: "framework" },
    { name: "NumPy", type: "framework" },
    { name: "Hugging Face Transformers", type: "framework" },
    { name: "LangChain", type: "framework" },
    { name: "Apache Spark", type: "framework" },
    { name: "Airflow", type: "framework" },
    { name: "Streamlit", type: "framework" },

    // ---------- Frameworks: testing ----------
    { name: "Jest", type: "framework" },
    { name: "Vitest", type: "framework" },
    { name: "Playwright", type: "framework" },
    { name: "Cypress", type: "framework" },
    { name: "Selenium", type: "framework" },
    { name: "Pytest", type: "framework" },
    { name: "JUnit", type: "framework" },

    // ---------- Frameworks: videojuegos ----------
    { name: "Unity", type: "framework" },
    { name: "Unreal Engine", type: "framework" },
    { name: "Godot", type: "framework" }
];

export async function seedCatalog(): Promise<void> {
    for (const name of FOCUS_AREAS) {
        await prisma.focusArea.upsert({ where: { name }, create: { name }, update: {} });
    }

    for (const tech of TECHNOLOGIES) {
        await prisma.technology.upsert({
            where: { name_type: { name: tech.name, type: tech.type } },
            create: tech,
            update: {}
        });
    }

    console.log(`Seeded ${FOCUS_AREAS.length} focus areas and ${TECHNOLOGIES.length} technologies.`);
}

if (import.meta.main) {
    seedCatalog()
        .then(() => prisma.$disconnect())
        .catch(async (error) => {
            console.error(error);
            await prisma.$disconnect();
            process.exit(1);
        });
}
