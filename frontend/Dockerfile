FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Create node_modules volume to persist dependencies
VOLUME ["/app/node_modules"]

# Expose port
EXPOSE 3000

# Set environment variables for development
ENV CHOKIDAR_USEPOLLING=true
ENV WATCHPACK_POLLING=true
ENV FAST_REFRESH=true

# Start the application
CMD ["npm", "start"]