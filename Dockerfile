FROM node:current-alpine3.19

ENV NODE_ENV=production

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

ENV PORT=3000

EXPOSE 3000

CMD ["npm", "start"]
