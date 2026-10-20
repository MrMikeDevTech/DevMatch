import { prisma } from "@/lib/prisma";

const USERNAME_TO_DELETE = "mrmikedevtech";

const FAKE_USERS = [
    { username: "ana_codes", fullName: "Ana Torres", title: "Frontend Developer", bio: "React y CSS todo el día. Café ☕ obligatorio." },
    { username: "devmartin", fullName: "Martín Gómez", title: "Backend Engineer", bio: "Node, Postgres y arquitectura de APIs." },
    { username: "lucia_ux", fullName: "Lucía Fernández", title: "UI/UX Designer", bio: "Diseño interfaces que la gente realmente usa." },
    { username: "pytorchpaco", fullName: "Francisco Díaz", title: "ML Engineer", bio: "Entrenando modelos y rompiendo GPUs." },
    { username: "sofidev", fullName: "Sofía Ramírez", title: "Full-stack Developer", bio: "De la DB al pixel. Full-stack por elección." },
    { username: "rust_hernandez", fullName: "Diego Hernández", title: "Systems Engineer", bio: "Rust enjoyer. Memoria segura o nada." },
    { username: "camila_qa", fullName: "Camila López", title: "QA Engineer", bio: "Rompo lo que ustedes construyen, con cariño." },
    { username: "mobilemateo", fullName: "Mateo Pérez", title: "Mobile Developer", bio: "Flutter y Kotlin para Android nativo." },
    { username: "valegamedev", fullName: "Valentina Castro", title: "Game Developer", bio: "Unity de día, Godot de noche." },
    { username: "devops_nico", fullName: "Nicolás Silva", title: "DevOps Engineer", bio: "Si no está en Docker, no existe." },
    { username: "isa_data", fullName: "Isabella Rojas", title: "Data Engineer", bio: "Pipelines, Airflow y café a las 6am." },
    { username: "brunoapi", fullName: "Bruno Medina", title: "API Developer", bio: "GraphQL vs REST, siempre dispuesto a debatir." }
] as const;

const POST_CONTENTS = [
    "Después de meses migramos el backend a Bun y la mejora de arranque fue brutal 🚀",
    "¿Alguien más prefiere Zustand sobre Redux para proyectos chicos? Se siente mucho más liviano.",
    "Tip del día: `noUncheckedIndexedAccess` en tsconfig te salva de un montón de bugs silenciosos.",
    "Terminé de armar mi primer pipeline de CI/CD con GitHub Actions self-hosted. Se siente bien tener control total del runner.",
    "Debugueando un memory leak en producción durante 3 horas para descubrir que era un `setInterval` sin `clearInterval`. Clásico.",
    "¿Prisma o Drizzle en 2026? Siento que la comunidad está cada vez más dividida.",
    "Hoy aprendí que SameSite=None necesita Secure sí o sí. Las cookies cross-domain no perdonan.",
    "Review de código: si tu PR tiene más de 500 líneas, probablemente debería ser dos PRs.",
    "Portando un servicio de Express a Hono. La diferencia de performance es notable.",
    "¿Alguien usa Astro en producción? Quiero feedback real antes de migrar mi blog.",
    "WebSockets + reconexión automática + estado consistente = un dolor de cabeza bien administrado.",
    "Acabo de resolver un bug de 2 semanas con una sola línea. Así es el dev life.",
    "Empezando a estudiar Rust en serio. El borrow checker me está rompiendo la cabeza (en el buen sentido).",
    "Diseñando el onboarding de una app nueva. Menos pasos siempre gana.",
    "¿TailwindCSS v4 vale la pena migrar ya o espero un poco más?",
    "Postgres con particionamiento por fecha cambió completamente nuestro tiempo de queries.",
    "Code review tip: preguntá 'por qué' antes de pedir cambios de estilo.",
    "Implementando rate limiting con Redis. Simple pero efectivo.",
    "La documentación de esta librería tiene 3 ejemplos y ninguno funciona. Clásico open source.",
    "Hoy toca refactor: sacar lógica de negocio de los controllers.",
    "Nada como un `git blame` para descubrir que el bug lo escribiste vos hace 6 meses.",
    "Probando Server-Sent Events como alternativa más simple a WebSockets para notificaciones.",
    "¿Alguna recomendación de libro sobre arquitectura de software para 2026?",
    "Optimizando bundle size: de 800kb a 210kb solo con lazy loading de rutas.",
    "El testing end-to-end con Playwright nos salvó de un bug crítico antes de deployar.",
    "Mi stack favorito sigue siendo TypeScript + Postgres + React. Simple y confiable.",
    "¿Cómo manejan ustedes feature flags? Estoy evaluando opciones.",
    "Aprendiendo sobre CRDTs para sincronización offline-first. Fascinante y complejo.",
    "Primera vez contribuyendo a un proyecto open source grande. Nervioso pero contento.",
    "Dockerizando toda la stack local. Adiós 'en mi máquina funciona'.",
    "Benchmark rápido: Bun vs Node para una API REST simple. Los resultados sorprenden.",
    "¿Vale la pena aprender Go en 2026 si ya sé TypeScript y Python?",
    "Implementé caché con Redis y bajé la latencia del endpoint de 400ms a 40ms.",
    "El error más tonto que cometí esta semana: olvidar el `await` en un map.",
    "Charla interna sobre seguridad: SQL injection sigue siendo top 1 en 2026, aún con ORMs.",
    "Migré de Webpack a Vite. El HMR es otro mundo.",
    "¿Alguien tiene experiencia con microservicios vs monolito modular? Debatiendo para un proyecto nuevo.",
    "Armando mi portfolio con Astro + MDX. Recomendadísimo para contenido técnico.",
    "Aprendiendo sobre WebAssembly para acelerar cálculos pesados en el browser.",
    "Pair programming hoy resolvió en 20 minutos algo que llevaba 2 días atascado."
];

function randomInt(max: number): number {
    return Math.floor(Math.random() * max);
}

function pickRandom<T>(arr: readonly T[]): T {
    return arr[randomInt(arr.length)]!;
}

function pickSome<T>(arr: T[], count: number): T[] {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, arr.length));
}

async function main() {
    const deleted = await prisma.user.deleteMany({ where: { username: USERNAME_TO_DELETE } });
    console.log(`Borrado perfil "${USERNAME_TO_DELETE}": ${deleted.count} usuario(s) eliminado(s).`);

    const focusAreas = await prisma.focusArea.findMany();
    const technologies = await prisma.technology.findMany();
    if (focusAreas.length === 0 || technologies.length === 0) {
        throw new Error("Corré primero `bun run db:seed` para poblar el catálogo de focus_areas/technologies.");
    }

    const createdUsers = [];
    for (const fake of FAKE_USERS) {
        const user = await prisma.user.create({
            data: {
                username: fake.username,
                email: `${fake.username}@seed.devmatch.local`,
                fullName: fake.fullName,
                professionalTitle: fake.title,
                bioMarkdown: fake.bio,
                avatarUrl: `https://api.dicebear.com/9.x/avataaars/svg?seed=${fake.username}`,
                isActive: true,
                isVerified: Math.random() < 0.2,
                onboardingCompleted: true,
                focusId: pickRandom(focusAreas).id,
                technologies: {
                    create: pickSome(technologies, 3 + randomInt(4)).map((t) => ({ technologyId: t.id }))
                }
            }
        });
        createdUsers.push(user);
    }
    console.log(`Creados ${createdUsers.length} usuarios de prueba.`);

    const createdPosts = [];
    const postCount = 40;
    for (let i = 0; i < postCount; i++) {
        const author = pickRandom(createdUsers);
        const post = await prisma.post.create({
            data: {
                userId: author.id,
                content: pickRandom(POST_CONTENTS),
                createdAt: new Date(Date.now() - randomInt(14) * 24 * 60 * 60 * 1000 - randomInt(86400000))
            }
        });
        createdPosts.push(post);
    }
    console.log(`Creados ${createdPosts.length} posts.`);

    let likeCount = 0;
    for (const post of createdPosts) {
        const likers = pickSome(
            createdUsers.filter((u) => u.id !== post.userId),
            randomInt(8)
        );
        for (const liker of likers) {
            await prisma.postLike.create({ data: { postId: post.id, userId: liker.id } }).catch(() => {});
            likeCount++;
        }
    }
    console.log(`Creados ${likeCount} likes.`);

    let repostCount = 0;
    for (const post of createdPosts) {
        if (Math.random() < 0.3) {
            const reposters = pickSome(
                createdUsers.filter((u) => u.id !== post.userId),
                1 + randomInt(2)
            );
            for (const reposter of reposters) {
                await prisma.repost.create({ data: { postId: post.id, userId: reposter.id } });
                repostCount++;
            }
        }
    }
    console.log(`Creados ${repostCount} reposts.`);

    let followCount = 0;
    for (const user of createdUsers) {
        const toFollow = pickSome(
            createdUsers.filter((u) => u.id !== user.id),
            2 + randomInt(4)
        );
        for (const followed of toFollow) {
            await prisma.follow.create({ data: { followerId: user.id, followedId: followed.id } }).catch(() => {});
            followCount++;
        }
    }
    console.log(`Creados ${followCount} follows.`);

    console.log("Listo.");
}

main()
    .then(() => prisma.$disconnect())
    .catch(async (error) => {
        console.error(error);
        await prisma.$disconnect();
        process.exit(1);
    });
