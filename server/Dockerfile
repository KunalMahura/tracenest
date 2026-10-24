FROM node:18-alpine

# Install build tools needed for native modules
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install all dependencies (including devDependencies for nodemon)
RUN npm install

# Copy source (will be overridden by volume in dev, used in prod)
COPY . .

EXPOSE 3000

CMD ["npm", "start"]
