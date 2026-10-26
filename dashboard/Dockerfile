FROM node:18-alpine

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy application source
COPY . .

EXPOSE 5173

# Run Vite dev server with host binding
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
