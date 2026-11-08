# Multi-stage Dockerfile para el Microservicio de Sincronización en Go (EcoRaíces)
# Etapa 1: Compilación ultra optimizada
FROM golang:1.23-alpine AS builder

WORKDIR /app

COPY go.mod ./
# Si existe go.sum se copia
RUN if [ -f go.sum ]; then go mod download; fi

COPY . .

# Compilación estática sin CGO para máxima portabilidad y velocidad
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o sync-service .

# Etapa 2: Imagen mínima de producción (~18MB)
FROM alpine:3.20

RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app

COPY --from=builder /app/sync-service /app/sync-service

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/sync/health || exit 1

CMD ["/app/sync-service"]
