FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY frontend ./frontend
COPY vite.config.js ./
COPY scripts ./scripts
COPY backend/proyectos.js ./backend/proyectos.js
RUN npm run build

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund && mkdir -p backend/data && chown -R node:node backend
COPY backend ./backend
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "backend/start.js"]
