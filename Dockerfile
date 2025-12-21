# Motia Backend Dockerfile for Railway
# Uses the official Motia Docker image with Node.js + Python polyglot support
FROM motiadev/motia:latest

WORKDIR /app

# Install Node.js Dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy Python requirements and install
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files (excluding frontend via .dockerignore)
COPY . .

# Install Motia Python dependencies
RUN npx motia@latest install

# Railway uses PORT environment variable
ENV PORT=4000
EXPOSE 4000

# Run Motia in production mode
# Railway will inject PORT, we use it directly
CMD ["sh", "-c", "npx motia start -p ${PORT:-4000}"]