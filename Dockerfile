# syntax=docker/dockerfile:1.7

# ============================================================================
# Stage 1: build
# ============================================================================
FROM node:24-alpine AS builder

# Tools needed to compile better-sqlite3 (native module)
RUN apk add --no-cache python3 make g++ libc6-compat

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build Next.js in standalone mode for smallest runtime image
ENV NEXT_TELEMETRY_DISABLED=1
ARG COMMIT_HASH
ENV COMMIT_HASH=${COMMIT_HASH}
RUN npm run build

# ============================================================================
# Stage 2: runtime
# ============================================================================
# Playwright/Chromium needs glibc, so we switch from alpine to debian-slim here.
# This is a ~80 MB increase in the final image but is the supported path -
# alpine + chromium is unmaintained and breaks regularly.
FROM node:24-bookworm-slim AS runner

# tini handles signal forwarding; gosu lets us drop privileges (debian's su-exec equivalent)
# Plus Chromium's system dependencies. Keep this list pruned - every package costs MB.
RUN apt-get update && apt-get install -y --no-install-recommends \
    tini gosu wget ca-certificates \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
    libgbm1 libpango-1.0-0 libcairo2 libasound2 libatspi2.0-0 \
    fonts-liberation fonts-noto-color-emoji \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd -g 1001 nodejs \
  && useradd -u 1001 -g nodejs -m -s /bin/bash nextjs

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATA_DIR=/data
ENV APP_UID=1001
ENV APP_GID=1001

# Playwright cache lives in a known location so the install in the builder stage
# and the runtime stage agree.
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Copy Next.js standalone output
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy ALL migration scripts (init-db, migrate-all, individual migrations)
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# better-sqlite3 native binding + its transitive runtime deps
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/bindings ./node_modules/bindings
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/file-uri-to-path ./node_modules/file-uri-to-path

# Playwright runtime - copy the playwright package and download the matching Chromium.
# We install just the chromium binary (skip firefox/webkit) to save ~300 MB.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/playwright ./node_modules/playwright
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/playwright-core ./node_modules/playwright-core

# Download Chromium into the persistent PLAYWRIGHT_BROWSERS_PATH
RUN mkdir -p ${PLAYWRIGHT_BROWSERS_PATH} \
  && chown -R nextjs:nodejs ${PLAYWRIGHT_BROWSERS_PATH} \
  && cd /app \
  && npx --no-install playwright install chromium \
  && chown -R nextjs:nodejs ${PLAYWRIGHT_BROWSERS_PATH}

# Entrypoint that handles ownership, secret generation, schema init, and migrations
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ARG COMMIT_HASH
ENV COMMIT_HASH=${COMMIT_HASH}

# Volume for persistent data
VOLUME ["/data"]
RUN mkdir -p /data && chown nextjs:nodejs /data

# Container starts as root so the entrypoint can fix bind-mount ownership.
# The entrypoint then drops to the nextjs user via gosu before exec'ing the app.
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:3000/api/health || exit 1

# tini handles signal forwarding; entrypoint does setup; then exec the Next.js server
ENTRYPOINT ["tini", "--", "/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "server.js"]
