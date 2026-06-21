FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
COPY shared/package*.json ./shared/
COPY backend/package*.json ./backend/

RUN npm ci --workspace=backend

COPY shared/ ./shared/
COPY backend/ ./backend/

EXPOSE 3000

CMD ["npm", "run", "start:dev", "--workspace=backend"]
