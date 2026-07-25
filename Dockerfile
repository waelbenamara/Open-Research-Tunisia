FROM node:22-alpine
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .
RUN npx prisma generate && npx next build

ENV NODE_ENV=production
EXPOSE 3001

# Migrations run on every start, so pulling a new image is a full deploy.
CMD ["sh", "-c", "npx prisma migrate deploy && npx next start -p 3001"]
