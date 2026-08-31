FROM node:22-alpine

WORKDIR /usr/src/app

COPY package.json package-lock.json ./

RUN npm ci
COPY app ./app

ENV PORT=3000
EXPOSE 3000

CMD ["node", "app/server.js"]
