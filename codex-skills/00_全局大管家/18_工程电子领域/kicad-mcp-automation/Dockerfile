# Build stage
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/mcp-server/package.json ./packages/mcp-server/
COPY apps/cli/package.json ./apps/cli/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the project
RUN pnpm build

# Test stage
FROM builder AS test
RUN pnpm test

# Production stage
FROM node:20-alpine

RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

WORKDIR /app

# Copy package files and install production dependencies
COPY package.json pnpm-workspace.yaml ./
COPY packages/mcp-server/package.json ./packages/mcp-server/
COPY apps/cli/package.json ./apps/cli/

RUN pnpm install --prod --frozen-lockfile

# Copy built artifacts
COPY --from=builder /app/packages/mcp-server/dist ./packages/mcp-server/dist
COPY --from=builder /app/apps/cli/dist ./apps/cli/dist

# Set default command
CMD ["node", "packages/mcp-server/dist/index.js"]
