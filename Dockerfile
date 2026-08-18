# --- Build stage ---
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG API_URL=/api
ARG APP_BASE_URL=http://localhost:4200
ENV API_URL=${API_URL} APP_BASE_URL=${APP_BASE_URL}
RUN sed -i "s|\${API_URL}|${API_URL}|g; s|\${APP_BASE_URL}|${APP_BASE_URL}|g" src/environments/environment.prod.ts \
    && npm run build -- --configuration production

# --- Runtime stage ---
FROM nginx:1.27-alpine
COPY --from=build /app/dist/frontend-app/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -q -O /dev/null http://localhost/ || exit 1