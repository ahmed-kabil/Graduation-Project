FROM node:alpine3.22
WORKDIR /app
COPY ./package.json .
RUN npm install
COPY . .
ENV PORT=4004
CMD ["node","app.js"]