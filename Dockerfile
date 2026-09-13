FROM node:22-alpine AS builder
WORKDIR /app
COPY backend/package*.json ./
COPY backend/tsconfig*.json ./
COPY backend/prisma ./prisma/
RUN npm install
COPY backend/src ./src
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000
COPY backend/package*.json ./
RUN npm install
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
RUN mkdir -p /app/uploads
EXPOSE 5000
CMD ["sh", "-c", "npx prisma db push && node dist/server.js"]
