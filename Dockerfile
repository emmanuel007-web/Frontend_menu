# --- Build stage ---
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG API_URL=/api
ARG APP_BASE_URL=http://localhost:4200
ENV API_URL=${API_URL} APP_BASE_URL=${APP_BASE_URL}
# Validación: los placeholders deben venir definidos y sin tokens ${...} sin
# resolver (falla el build en CI en lugar de desplegar una app rota/insegura).
RUN if [ -z "$API_URL" ] || [ -z "$APP_BASE_URL" ] \
    || echo "$API_URL" | grep -q '\$' || echo "$APP_BASE_URL" | grep -q '\$'; then \
      echo "ERROR: API_URL y APP_BASE_URL son obligatorios y no pueden contener '\${...}'"; exit 1; \
    fi
RUN sed -i "s|\${API_URL}|${API_URL}|g; s|\${APP_BASE_URL}|${APP_BASE_URL}|g" src/environments/environment.prod.ts \
    && grep -q '\${' src/environments/environment.prod.ts && { \
         echo "ERROR: quedaron placeholders sin resolver en environment.prod.ts"; exit 1; } || true
RUN npm run build -- --configuration production

# --- Runtime stage ---
FROM nginx:1.27-alpine
# BACKEND_ORIGIN: origen del backend (ej. https://mi-backend.onrender.com).
# PORT: puerto donde escucha nginx (Render inyecta PORT automaticamente).
ARG BACKEND_ORIGIN=http://backend:8080
ENV BACKEND_ORIGIN=${BACKEND_ORIGIN} PORT=80
COPY --from=build /app/dist/frontend-app/browser /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -q -O /dev/null "http://localhost:${PORT}/" || exit 1