import type { Server } from "node:http";
import { WebSocketServer, WebSocket, type RawData } from "ws";
import { getSessionUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getOrCreateConversation, createMessage } from "@/lib/conversations";

const connections = new Map<string, Set<WebSocket>>();

function addConnection(userId: string, socket: WebSocket) {
    const set = connections.get(userId) ?? new Set<WebSocket>();
    set.add(socket);
    connections.set(userId, set);
}

function removeConnection(userId: string, socket: WebSocket) {
    const set = connections.get(userId);
    set?.delete(socket);
    if (set && set.size === 0) connections.delete(userId);
}

function sendTo(userId: string, payload: unknown) {
    const set = connections.get(userId);
    if (!set) return;
    const data = JSON.stringify(payload);
    for (const socket of set) {
        if (socket.readyState === WebSocket.OPEN) socket.send(data);
    }
}

async function handleIncoming(userId: string, raw: RawData) {
    let data: {
        type?: string;
        to?: string;
        content?: string;
        imageUrl?: string;
        codeContent?: string;
        codeLanguage?: string;
    };
    try {
        data = JSON.parse(raw.toString());
    } catch {
        return;
    }

    if (data.type !== "send" || !data.to) return;

    const content = data.content?.trim() || undefined;
    const imageUrl = data.imageUrl?.trim() || undefined;
    const codeContent = data.codeContent?.trim() || undefined;
    if (!content && !imageUrl && !codeContent) return;

    const target = await prisma.user.findUnique({ where: { username: data.to } });
    if (!target || target.id === userId) return;

    const conversation = await getOrCreateConversation(userId, target.id);
    const message = await createMessage(conversation.id, userId, {
        content,
        imageUrl,
        codeContent,
        codeLanguage: data.codeLanguage?.trim() || undefined
    });

    const payload = {
        type: "message",
        conversationId: conversation.id,
        message: {
            id: message.id.toString(),
            conversationId: message.conversationId,
            content: message.content,
            imageUrl: message.imageUrl,
            codeContent: message.codeContent,
            codeLanguage: message.codeLanguage,
            createdAt: message.createdAt,
            sender: message.sender
        }
    };

    sendTo(userId, payload);
    sendTo(target.id, payload);
}

export function attachWebSocketServer(server: Server) {
    const wss = new WebSocketServer({
        server,
        path: "/ws",
        verifyClient: (info, callback) => {
            const userId = getSessionUserId(info.req.headers.cookie);
            callback(Boolean(userId), 401, "Unauthorized");
        }
    });

    wss.on("connection", (socket, request) => {
        const userId = getSessionUserId(request.headers.cookie);
        if (!userId) {
            socket.close(4001, "Unauthorized");
            return;
        }

        const pending: RawData[] = [];
        let ready = false;

        socket.on("message", (raw: RawData) => {
            if (!ready) {
                pending.push(raw);
                return;
            }
            handleIncoming(userId, raw);
        });

        socket.on("close", () => removeConnection(userId, socket));

        prisma.user.findUnique({ where: { id: userId } }).then((user) => {
            if (!user || !user.isActive || !user.onboardingCompleted) {
                socket.close(4001, "Unauthorized");
                return;
            }

            addConnection(userId, socket);
            ready = true;
            for (const raw of pending) handleIncoming(userId, raw);
            pending.length = 0;
        });
    });

    return wss;
}
