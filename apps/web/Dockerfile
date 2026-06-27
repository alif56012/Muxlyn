FROM oven/bun:1-slim AS builder
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile

FROM oven/bun:1-slim AS production
WORKDIR /app
COPY --from=builder /app ./
WORKDIR /app/apps/web
RUN bun run build

FROM nginx:alpine
COPY --from=production /app/apps/web/dist /usr/share/nginx/html
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
