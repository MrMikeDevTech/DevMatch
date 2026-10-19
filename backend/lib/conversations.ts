import { prisma } from "@/lib/prisma";

export async function getOrCreateConversation(userIdA: string, userIdB: string) {
    const [user1Id, user2Id] = userIdA < userIdB ? [userIdA, userIdB] : [userIdB, userIdA];

    return prisma.conversation.upsert({
        where: { user1Id_user2Id: { user1Id, user2Id } },
        create: { user1Id, user2Id },
        update: {}
    });
}

export type NewMessageInput = {
    content?: string;
    imageUrl?: string;
    codeContent?: string;
    codeLanguage?: string;
};

export async function createMessage(conversationId: string, senderId: string, input: NewMessageInput) {
    const [message] = await prisma.$transaction([
        prisma.message.create({
            data: {
                conversationId,
                senderId,
                content: input.content,
                imageUrl: input.imageUrl,
                codeContent: input.codeContent,
                codeLanguage: input.codeLanguage
            },
            include: { sender: { select: { id: true, username: true, fullName: true, avatarUrl: true } } }
        }),
        prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() }
        })
    ]);

    return message;
}
