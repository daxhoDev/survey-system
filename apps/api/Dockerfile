# API image (DEV-WF-03). Build from the repository root, which is the pnpm
# workspace:  docker build -f apps/api/Dockerfile -t sondix-api .
# Configuration comes from environment variables at run time; no .env file is
# copied into the image (see docs/sdd/05-configuration.md).

ARG NODE_VERSION=24.19.0

FROM node:${NODE_VERSION}-alpine AS base
RUN npm install --global pnpm@11.5.3
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY packages/schemas/package.json packages/schemas/

# Every dependency, to compile.
FROM base AS build
RUN pnpm install --frozen-lockfile --filter "@survey-system/api..."
COPY tsconfig.base.json ./
COPY packages/schemas packages/schemas
COPY apps/api apps/api
RUN pnpm --filter @survey-system/schemas build
WORKDIR /repo/apps/api
RUN pnpm exec prisma generate && pnpm build

# Production dependencies only, for the final image.
FROM base AS prod-deps
RUN pnpm install --frozen-lockfile --prod --filter "@survey-system/api..."

FROM node:${NODE_VERSION}-alpine
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=prod-deps /repo/node_modules node_modules
COPY --from=prod-deps /repo/packages/schemas/node_modules packages/schemas/node_modules
COPY --from=build /repo/packages/schemas/package.json packages/schemas/
COPY --from=build /repo/packages/schemas/dist packages/schemas/dist
COPY --from=prod-deps /repo/apps/api/node_modules apps/api/node_modules
COPY --from=build /repo/apps/api/package.json /repo/apps/api/prisma.config.ts apps/api/
COPY --from=build /repo/apps/api/prisma apps/api/prisma
COPY --from=build /repo/apps/api/dist apps/api/dist
WORKDIR /repo/apps/api
USER node
EXPOSE 3000
# Pending migrations are applied on every start, then the server replaces the
# shell (DEV-WF-07).
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && exec node dist/server.js"]
