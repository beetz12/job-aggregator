# Motia Backend Dockerfile for Railway
# Uses the official Motia Docker image with Node.js + Python polyglot support
FROM motiadev/motia:latest

WORKDIR /app

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

# Run Motia in production mode
CMD ["sh", "-c", "npx motia start -p ${PORT:-4000}"]