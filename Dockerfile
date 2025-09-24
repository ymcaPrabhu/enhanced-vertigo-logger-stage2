# Multi-stage Docker build for Vertigo Logger Stage 2
FROM rust:1.75-slim as builder

# Install system dependencies including curl for health check
RUN apt-get update && apt-get install -y \
    libsqlite3-dev \
    pkg-config \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy manifests first for better layer caching
COPY Cargo.toml Cargo.lock ./

# Build dependencies first (this layer will be cached if dependencies don't change)
RUN mkdir src && echo "fn main() {}" > src/main.rs && cargo build --release && rm -rf src

# Copy source code
COPY src ./src
COPY static ./static
COPY migrations ./migrations
COPY diesel.toml ./

# Build the application
RUN cargo build --release

# Runtime stage - use same base for consistency
FROM debian:bookworm-slim

# Install runtime dependencies including curl for health check
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libsqlite3-0 \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create app directory
WORKDIR /app

# Copy the binary from builder stage
COPY --from=builder /app/target/release/vertigo-logger ./
COPY --from=builder /app/static ./static
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/diesel.toml ./

# Create database directory and set permissions
RUN mkdir -p /app/data && chmod 755 /app/data

# Create non-root user for security
RUN useradd -r -s /bin/false -d /app appuser && chown -R appuser:appuser /app
USER appuser

# Set environment variables
ENV DATABASE_URL=/app/data/vertigo.db
ENV RUST_LOG=info
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check with proper timeout
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Run the binary
CMD ["./vertigo-logger"]