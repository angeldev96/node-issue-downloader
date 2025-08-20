# Use Node.js 18 LTS for better compatibility
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p cache downloads logs

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
