# Stage 1: Build
FROM node:20.19.2-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build


# Stage 2: Production
FROM node:20.19.2-slim AS production

ENV NODE_ENV=production

WORKDIR /app

# Only copy the production deps
COPY package*.json ./
# RUN npm install
# RUN npm install --omit=dev
RUN npm install --only=production --legacy-peer-deps

# Copy only built code and necessary files
COPY --from=builder /app/dist ./dist

# Optionally copy only what you need
# COPY --from=builder /app/package.json ./
# COPY --from=builder /app/.env ./

EXPOSE 3000

CMD ["node", "dist/index"]