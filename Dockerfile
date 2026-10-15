# syntax=docker/dockerfile:1
# The planner in one image: the API serves the built web app. Parties are stored in SQLite under
# /data, so mount a volume there to keep them:
#
#   docker build -t bg3planner .
#   docker run -p 3000:3000 -v bg3planner-data:/data bg3planner

FROM node:22-bookworm-slim AS manifests
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY packages/gamedata/package.json packages/gamedata/
COPY packages/importer/package.json packages/importer/
COPY packages/rules/package.json packages/rules/
COPY packages/shared/package.json packages/shared/

FROM manifests AS build
RUN npm ci
COPY . .
RUN npm run build -w @bg3planner/web && npm run build -w @bg3planner/server

FROM node:22-bookworm-slim
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    DATABASE_PATH=/data/bg3planner.db \
    WEB_ROOT=/app/web
WORKDIR /app
# The server build is self-contained (see apps/server/tsup.config.ts): no node_modules needed.
COPY --from=build /app/apps/server/dist ./server
COPY --from=build /app/apps/web/dist ./web
RUN mkdir /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --start-interval=2s \
  CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/api/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
CMD ["node", "--disable-warning=ExperimentalWarning", "server/index.js"]
