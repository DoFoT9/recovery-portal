# syntax=docker/dockerfile:1.7

# ============================================================================
# Stage 1: build
# ============================================================================
FROM node:24-bookworm-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ git cmake \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

COPY package*.json ./
RUN npm ci

# Install Chromium for Playwright (PDF generation in v7.4.3+)
RUN mkdir -p ${PLAYWRIGHT_BROWSERS_PATH} \
  && npx playwright install chromium

# ----------------------------------------------------------------------------
# Build whisper.cpp from source (v7.5 audio transcription)
# GGML_NATIVE=OFF for portable binaries (otherwise -march=native bakes in
# CPU features that may not exist on the runtime host).
# ----------------------------------------------------------------------------
ENV WHISPER_DIR=/opt/whisper.cpp
RUN git clone --depth 1 --branch v1.9.1 https://github.com/ggml-org/whisper.cpp.git ${WHISPER_DIR} \
  && cd ${WHISPER_DIR} \
  && cmake -B build -DGGML_NATIVE=OFF -DWHISPER_BUILD_TESTS=OFF -DWHISPER_BUILD_EXAMPLES=ON \
  && cmake --build build --config Release -j$(nproc) \
  && bash ./models/download-ggml-model.sh base.en \
  && rm -rf .git build/CMakeFiles build/_deps

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ARG COMMIT_HASH
ENV COMMIT_HASH=${COMMIT_HASH}
RUN npm run build

# ============================================================================
# Stage 2: runtime
# ============================================================================
FROM node:24-bookworm-slim AS runner

# tini + gosu + Chromium deps (v7.4.3) + ffmpeg (v7.5 audio extraction)
RUN apt-get update && apt-get install -y --no-install-recommends \
    tini gosu wget ca-certificates ffmpeg \
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
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# v7.5: whisper.cpp install path
ENV WHISPER_BIN=/opt/whisper.cpp/build/bin/whisper-cli
ENV WHISPER_MODEL=/opt/whisper.cpp/models/ggml-base.en.bin

# Next.js standalone output
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Migration scripts
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# better-sqlite3 native binding + transitive deps
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/bindings ./node_modules/bindings
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/file-uri-to-path ./node_modules/file-uri-to-path

# Playwright runtime
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/playwright ./node_modules/playwright
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/playwright-core ./node_modules/playwright-core
COPY --from=builder --chown=nextjs:nodejs ${PLAYWRIGHT_BROWSERS_PATH} ${PLAYWRIGHT_BROWSERS_PATH}
RUN chown -R nextjs:nodejs ${PLAYWRIGHT_BROWSERS_PATH}

# whisper.cpp binary + base.en model (~140 MB)
COPY --from=builder /opt/whisper.cpp/build/bin/whisper-cli /opt/whisper.cpp/build/bin/whisper-cli
COPY --from=builder /opt/whisper.cpp/models/ggml-base.en.bin /opt/whisper.cpp/models/ggml-base.en.bin
RUN chown -R nextjs:nodejs /opt/whisper.cpp

# Entrypoint
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ARG COMMIT_HASH
ENV COMMIT_HASH=${COMMIT_HASH}

VOLUME ["/data"]
RUN mkdir -p /data && chown nextjs:nodejs /data

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:3000/api/health || exit 1

ENTRYPOINT ["tini", "--", "/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "server.js"]
