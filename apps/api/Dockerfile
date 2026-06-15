FROM node:22-alpine

COPY src /app/
COPY prisma /app/
COPY package.json /app/
COPY prisma.config.ts /app/
COPY .env /app/

WORKDIR /app/

RUN pnpm install
RUN pnpm build

CMD ['pnpm', 'start']