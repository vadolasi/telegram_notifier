FROM node:alpine

WORKDIR /app

COPY package.json .

RUN npm i -g pnpm

RUN pnpm install

COPY --chown=node:node . .

EXPOSE $PORT

CMD ["pnpm", "run", "start:prod"]
