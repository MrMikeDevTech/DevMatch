import express, { type NextFunction, type Request, type Response } from "express";
import { MulterError } from "multer";
import authRouter from "@/routes/auth";
import catalogRouter from "@/routes/catalog";
import usersRouter from "@/routes/users";
import postsRouter from "@/routes/posts";
import uploadsRouter from "@/routes/uploads";
import discoverRouter from "@/routes/discover";
import commentsRouter from "@/routes/comments";
import messagesRouter from "@/routes/messages";
import { attachWebSocketServer } from "@/lib/ws";

const app = express();
const PORT = Number(process.env.BACKEND_PORT) || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:4321";

app.use((req: Request, res: Response, next: NextFunction) => {
    res.header("Access-Control-Allow-Origin", FRONTEND_URL);
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
        res.sendStatus(204);
        return;
    }
    next();
});

app.use(express.json());

app.use("/auth", authRouter);
app.use("/catalog", catalogRouter);
app.use("/users", usersRouter);
app.use("/posts", postsRouter);
app.use("/uploads", uploadsRouter);
app.use("/discover", discoverRouter);
app.use("/comments", commentsRouter);
app.use("/messages", messagesRouter);

app.get("/", (_req: Request, res: Response) => {
    res.send("Hello World!");
});

// eslint-disable-next-line no-unused-vars -- Express only treats this as error middleware if it has 4 params
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof MulterError) {
        const message = err.code === "LIMIT_FILE_SIZE" ? "Image must be under 10MB" : err.message;
        res.status(400).json({ error: message });
        return;
    }
    if (typeof err === "object" && err !== null && "http_code" in err && "message" in err) {
        const cloudinaryError = err as { http_code: number; message: string };
        res.status(400).json({ error: cloudinaryError.message });
        return;
    }
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
});

const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

attachWebSocketServer(server);
