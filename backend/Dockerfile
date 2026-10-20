FROM oven/bun:1

WORKDIR /app

COPY package.json ./
RUN bun install --production

COPY . .

RUN bunx prisma generate --config prisma7.config.ts

ENV NODE_ENV=production

EXPOSE 5001

CMD ["bun", "run", "index.ts"]
