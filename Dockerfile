# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm — pinned to the version in package.json "packageManager".
# An unpinned `npm install -g pnpm` installs the newest major (12.x), which then
# tries to self-switch to 10.33.2 via the @pnpm/exe native binary — none exists
# for linux-x64-musl (Alpine), so the build dies with
# ERR_PNPM_PNPM_ENGINE_NO_NATIVE_BINARY. Keep this in sync with packageManager.
RUN npm install -g pnpm@10.33.2

# Copy package files + patches
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches/
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Accept VITE_* build-time env vars from Railway (baked into the JS bundle by Vite)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Google Maps (Catalog + GrantDetail). Without these, the client renders
# the "Map unavailable" fallback even if the key is set at runtime.
ARG VITE_GOOGLE_MAPS_BROWSER_KEY
ARG VITE_GOOGLE_MAPS_MAP_ID
ENV VITE_GOOGLE_MAPS_BROWSER_KEY=$VITE_GOOGLE_MAPS_BROWSER_KEY
ENV VITE_GOOGLE_MAPS_MAP_ID=$VITE_GOOGLE_MAPS_MAP_ID

# Build client + server
RUN pnpm run build

# Stage 2: Production
FROM node:22-alpine AS runner

WORKDIR /app

# Same pin as the builder stage (see comment above).
RUN npm install -g pnpm@10.33.2

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
