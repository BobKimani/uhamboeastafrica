# syntax=docker/dockerfile:1

# ---------- 1. Install dependencies ----------
FROM node:24-alpine AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci


# ---------- 2. Build the Next.js standalone output ----------
FROM node:24-alpine AS builder

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

# NEXT_PUBLIC_* values are inlined into the client bundle at build time,
# so they must be supplied as build args (not only at runtime).
ARG NEXT_PUBLIC_API_URL=https://api.uhamboeastafrica.com
ARG NEXT_PUBLIC_MEDIA_URL=https://api.uhamboeastafrica.com/media
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
# Server-only URL for the /api rewrite (baked into the routes manifest at build).
# Leave empty to use NEXT_PUBLIC_API_URL, or set e.g. http://backend:8000 to
# reach FastAPI over the Docker network.
ARG BACKEND_API_URL=

ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_MEDIA_URL=${NEXT_PUBLIC_MEDIA_URL}
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=${NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
ENV BACKEND_API_URL=${BACKEND_API_URL}

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

RUN test -n "$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY" \
    || (echo "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is missing" && exit 1)

RUN npm run build


# ---------- 3. Minimal production runtime ----------
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# There is no `public/` directory in this project. If one is added, also copy it:
# COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -q --spider http://127.0.0.1:3000/ || exit 1

CMD ["node", "server.js"]
