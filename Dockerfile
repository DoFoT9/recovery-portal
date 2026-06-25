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
FROM node:24-alpine AS runner

RUN apk add --no-cache libc6-compat tini wget && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATA_DIR=/data

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

# Entrypoint that handles secret generation, schema init, and migrations
COPY --chown=nextjs:nodejs docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ARG COMMIT_HASH
ENV COMMIT_HASH=${COMMIT_HASH}

# Volume for persistent data
VOLUME ["/data"]
RUN mkdir -p /data && chown nextjs:nodejs /data

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:3000/api/health || exit 1

# tini handles signal forwarding; entrypoint does setup; then exec the Next.js server
ENTRYPOINT ["tini", "--", "/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "server.js"]
