FROM node:22-alpine AS builder

WORKDIR /app

COPY "round 2/backend/package*.json" ./
COPY "round 2/backend/tsconfig*.json" ./
COPY "round 2/backend/prisma" ./prisma/

RUN npm install

COPY "round 2/backend/src" ./src

RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

COPY "round 2/backend/package*.json" ./
RUN npm install --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 5000

CMD ["sh", "-c", "npx prisma db push && node dist/server.js"]
