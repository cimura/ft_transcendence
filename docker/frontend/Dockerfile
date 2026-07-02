FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
COPY shared/package*.json ./shared/
COPY frontend/package*.json ./frontend/

RUN npm ci --workspace=frontend --workspace=shared

COPY shared/ ./shared/
COPY frontend/ ./frontend/

EXPOSE 5173

CMD ["sh", "-c", "cd frontend && npm run dev -- --host 0.0.0.0"]
