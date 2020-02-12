FROM node:13.8.0-alpine3.11

WORKDIR /opt/teneo-khoros-webhook
COPY package*.json ./
RUN npm install
COPY . .
COPY .sample.env .env
EXPOSE 3000
ENTRYPOINT ["npm", "start"]