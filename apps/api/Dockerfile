FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY src ./src
COPY .env.example ./.env.example
COPY data ./data
EXPOSE 3000
CMD ["node", "src/server.js"]
