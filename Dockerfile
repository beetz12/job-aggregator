# Motia Backend Dockerfile for Railway
# Uses the official Motia Docker image with Node.js + Python polyglot support
FROM motiadev/motia:latest

# Cache buster - change this value to force Railway to rebuild
ARG CACHEBUST=20251221-v6
RUN echo "Cache bust: $CACHEBUST"

WORKDIR /app

# Install curl for health checks
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Install ALL Node.js Dependencies (including dev for build)
COPY package*.json ./
RUN npm ci

# Copy Python requirements and install
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files (excluding frontend via .dockerignore)
COPY . .

# Install Motia Python dependencies
RUN npx motia@latest install

# Build for production (CRITICAL - was missing!)
RUN npx motia build

# Railway uses PORT environment variable
ENV PORT=4000
EXPOSE 4000

# Health check for Railway (railway.json is IGNORED with Dockerfile builder!)
# This is the ONLY way to configure health checks when using Dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=5 \
  CMD curl -f http://localhost:${PORT:-4000}/health || exit 1

# Run Motia in production mode
CMD ["sh", "-c", "npx motia start -p ${PORT:-4000}"]