# Stage 1: Build
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Install build tools for native dependencies (like better-sqlite3)
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies
RUN npm ci

# Copy source code
COPY . .

# Build frontend and backend
RUN npm run build
RUN npm run build:server

# Stage 2: Production
FROM node:22-bookworm-slim AS runner

WORKDIR /app

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_PATH=/app/data

# Install build tools temporarily for native dependencies, install prod deps, then clean up
COPY package.json package-lock.json* ./
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && npm ci --omit=dev \
    && apt-get purge -y --auto-remove python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy built assets from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-server ./dist-server

# Create data directory and set permissions
RUN mkdir -p /app/data && chown -R node:node /app/data

# Use non-root user for security
USER node

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["node", "dist-server/server.js"]
