# Motia Backend Dockerfile for Railway
# Uses the official Motia Docker image with Node.js + Python polyglot support
FROM motiadev/motia:latest

# Cache buster - change this value to force Railway to rebuild
ARG CACHEBUST=20251221-v16
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

# Railway injects PORT environment variable, default to 4000 for local testing
ENV PORT=4000
# Set NODE_ENV to production for proper production behavior
ENV NODE_ENV=production
EXPOSE 4000

# NOTE: Removed Dockerfile HEALTHCHECK - Railway handles health checks via railway.json
# This avoids potential PORT mismatch issues during container startup

# Run Motia in production mode with explicit PORT and HOST binding
CMD ["sh", "-c", "echo \"Starting Motia on port $PORT\" && exec npx motia start -p $PORT -H 0.0.0.0"]