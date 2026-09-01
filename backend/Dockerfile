# ── Backend (Node/Express + Prisma) ─────────────────────────────────────────
FROM node:20-slim AS base
WORKDIR /app
# OpenSSL é exigido pelo Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Dependências (ignora scripts: o prisma generate roda no estágio de build)
FROM base AS deps
COPY package*.json ./
RUN npm ci --ignore-scripts

# Build (prisma generate + tsc)
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Runtime
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package*.json prisma.config.ts tsconfig.json ./
# Pasta de uploads (montada como volume em produção)
RUN mkdir -p uploads
EXPOSE 3001
# start = prisma migrate deploy && node dist/server.js
CMD ["npm", "run", "start"]
