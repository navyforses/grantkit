# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build client + server
RUN pnpm run build

# Stage 2: Production
FROM node:22-alpine AS runner

WORKDIR /app

RUN npm install -g pnpm

# Copy only what's needed for production
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/src/data ./client/src/data

# Set production env
ENV NODE_ENV=production
ENV PORT=10000

EXPOSE 10000

CMD ["node", "dist/index.js"]
