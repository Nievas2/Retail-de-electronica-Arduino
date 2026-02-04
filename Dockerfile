# ---- Build stage ----
FROM node:24-alpine AS build

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build
RUN npm run build

# ---- Runtime stage ----
FROM node:24-alpine

WORKDIR /app
ENV NODE_ENV=production

# Only production deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copy build output
COPY --from=build /app/dist ./dist

# Default port
EXPOSE 3000

CMD ["node", "dist/main.js"]
