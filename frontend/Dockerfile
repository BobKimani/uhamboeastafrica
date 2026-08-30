FROM node:20-alpine AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci


FROM node:20-alpine AS builder

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

ARG BACKEND_API_URL
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_MEDIA_URL=https://d2fbz2lzk71lum.cloudfront.net
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

ENV BACKEND_API_URL=${BACKEND_API_URL}
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_MEDIA_URL=${NEXT_PUBLIC_MEDIA_URL}
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=${NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

RUN test -n "$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY" \
    || (echo "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is missing" && exit 1)

RUN npm run build


FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]