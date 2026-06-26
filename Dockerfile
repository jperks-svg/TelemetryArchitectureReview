FROM node:22-alpine AS build

WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:22-alpine AS server

WORKDIR /app
COPY server/package.json ./server/
RUN cd server && npm install
COPY server/ ./server/
COPY --from=build /app/dist ./dist

EXPOSE 3001
ENV NODE_ENV=production
CMD ["node", "server/index.js"]
