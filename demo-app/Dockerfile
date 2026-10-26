FROM node:18-alpine

WORKDIR /app

# Copy SDK and demo-app files
COPY sdk ./sdk
COPY demo-app/package*.json ./demo-app/

WORKDIR /app/demo-app
RUN npm install

COPY demo-app/ ./

EXPOSE 4000

CMD ["node", "server.js"]
