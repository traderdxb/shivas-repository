FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Generate Prisma Client
RUN npx prisma generate

# Copy application files
COPY . .

# Create directories for uploads and certificates
RUN mkdir -p uploads certificates

# Expose port
EXPOSE 5000

# Start script
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
