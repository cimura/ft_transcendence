FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
COPY shared/package*.json ./shared/
COPY frontend/package*.json ./frontend/

RUN npm ci --workspace=frontend

COPY shared/ ./shared/
COPY frontend/ ./frontend/

EXPOSE 5173

CMD ["npm", "run", "dev", "--workspace=frontend", "--", "--host", "0.0.0.0"]
