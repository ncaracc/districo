FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
# `next start` rilegge next.config.ts a runtime (non solo in fase di build) per
# sapere limiti/esperimenti come serverActions.bodySizeLimit — senza questo
# file nell'immagine finale, Next.js ricade silenziosamente sui default (1MB
# per le Server Actions), vanificando il limite di 20MB configurato.
COPY --from=builder /app/next.config.ts ./next.config.ts

RUN mkdir -p /app/uploads

EXPOSE 3000
CMD ["npm", "start"]
