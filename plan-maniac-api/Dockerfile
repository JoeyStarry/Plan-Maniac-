# ============ Stage 1: Build ============
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

# ============ Stage 2: Production ============
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

RUN npx prisma generate

EXPOSE 3000

CMD ["node", "dist/main.js"]
