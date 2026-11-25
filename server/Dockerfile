# syntax=docker/dockerfile:1
#
# TraceNest server image — used for BOTH the API and the log worker.
#   API:    node src/server.js            (default CMD)
#   Worker: node src/workers/logWorker.js (override the start command)
#
# Targets:
#   dev  — all deps incl. nodemon; source is bind-mounted by docker-compose.yml
#   prod — default; production deps only, runs as the non-root `node` user

# ── Base ────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false

# ── Dev (local docker-compose only) ─────────────────────────────────
FROM base AS dev
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ── Production dependencies ─────────────────────────────────────────
FROM base AS deps
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ── Production runtime ──────────────────────────────────────────────
FROM node:20-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000

# tini reaps zombies and forwards SIGTERM so graceful shutdown runs
RUN apk add --no-cache tini

COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package*.json ./
COPY --chown=node:node src ./src

USER node
EXPOSE 3000

# Uses $PORT at runtime (Railway injects its own). Worker deploys should
# disable this healthcheck — the worker has no HTTP server.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/server.js"]
