# Stage 1: install dependencies
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# Stage 2: copy source and node modules to slim runtime
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache curl
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 3000 9100
CMD ["sh", "-c", "npm run migrate && npm run seed && node index.js"]


