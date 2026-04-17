# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files + patches
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches/
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Accept VITE_* build-time env vars from Railway (baked into the JS bundle by Vite)
ARG VITE_MAPBOX_TOKEN
ENV VITE_MAPBOX_TOKEN=$VITE_MAPBOX_TOKEN

ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Build client + server
RUN pnpm run build

# Stage 2: Production
FROM node:22-alpine AS runner

WORKDIR /app

RUN npm install -g pnpm

# Copy only what's needed for production
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches/
RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/src/data ./client/src/data

# Copy Drizzle migration files for auto-migration on startup
COPY --from=builder /app/drizzle ./drizzle

# Set production env
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Auto-run migrations before starting the server.
# dist/migrate.js is compiled from server/migrate.ts using drizzle-orm/mysql2/migrator.
CMD ["sh", "-c", "node dist/migrate.js || echo '[migrate] Migration failed, starting server anyway'; node dist/index.js"]
