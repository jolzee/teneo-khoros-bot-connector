# teneo-khoros-bot-connector

- [About the Connector](#About-the-Connector)
- [Running the Connector on Heroku](#Running-the-Connector-on-Heroku)
- [Docker](#Docker)
  - [`.env` Environment Variables](#`.env`-Environment-Variables)
  - [Run Latest Docker Image](#Run-Latest-Docker-Image)
  - [Notes on Building, Running and Pushing Docker Image](#Notes-on-Building-Running-and-Pushing-Docker-Image)
- [Docker Compose](#Docker-Compose)

## About the Connector

This connector will register [Teneo](https://www.teneo.ai/) as a bot in [Khoros Response](https://khoros.com/platform/care/response) . The connector allows [Teneo](https://www.teneo.ai/) to automatically respond to social media posts on both Twitter and Facebook through Khoros.

### The bot is capable of:

- Resolving
- Adding notes
- Tagging
- Changing Queues
- Handing to human agent
- Holding a conversation and replying:
  - Plain Text - with url links
  - Rich Responses
    - Image
    - Video
    - Rich Video - with title and body text
    - Rich Images - with title and body text

This can be controlled in Teneo with a output parameter called `khoros` with a value formatted with any sensible combination of line based values shown below:

```
image | imageUrl ||
video | videoUrlMp4 ||
handover | commentText ||
resolve | commentText||
tags | 123,234,555 ||
note | noteText ||
priortiy | 0 ||
workQueue | workQueueIdName | comment ||
richImage | imageLinkUrl | imageTitle | imageUrl | mimeTypeOfImage ||
richVideo | videoLinkUrl | videoTitle | videoUrl | mimeTypeOfVideo ||
```

### Webhook Routes

| Context Path | Description                                                                                                                             |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `/`          | Default webhook path for all inbound Khoros posts                                                                                       |
| `/register`  | GET once to register bot with Khoros and to register interest<br>in both Twitter and Facebook as well as obtain an authentication token. |

[GitHub](https://github.com/jolzee/teneo-khoros-bot-connector)

## Running the Connector on Heroku

If you don't already have a Redis Server then you can get one running at [Redis Cloud](https://elements.heroku.com/addons/rediscloud) . Redis is used for session storage and for the long term persistence of the Khoros auth token.

Click the button below to deploy the connector to Heroku:

[![Deploy](https://www.herokucdn.com/deploy/button.svg?classes=heroku)](https://heroku.com/deploy?template=https://github.com/jolzee/teneo-khoros-bot-connector)

## Docker

### `.env` Environment Variables

Remember to copy `.sample.env` to `.env` before running the Docker image.

```
REDIS_HOST=
REDIS_PORT=6379
REDIS_PASSWORD=
TENEO_BOT_NAME=Teneo
TENEO_SUPPORT_EMAIL=
TENEO_TIE_URL=
TENEO_AVATAR_URL=
TENEO_CALLBACK_URL=
KHOROS_BASE_API_URL=https://api.app.lithium.com/bots/v3
KHOROS_BASE_TOKEN_URL=https://<serverUrl>.response.lithium.com/api/v2/tokens/khorosapi/ownerId/
KHOROS_ACCESS_TOKEN_CACHE_KEY=khorosBotAccessToken
KHOROS_CREDENTIALS_USERNAME=<myKhorosUsername>
KHOROS_CREDENTIALS_PASSWORD=<myKhorosPassword>
KHOROS_APP_ID=<appId>
KHOROS_COMPANY_KEY=<cmpyKey>
KHOROS_NETWORK_TWITTER_EXTERNAL_ID=<something>
KHOROS_NETWORK_TWITTER_AUTH_ACCOUNT_ID=<something>
KHOROS_NETWORK_TWITTER_AUTH_CONSUMER_KEY=<something>
KHOROS_NETWORK_TWITTER_AUTH_CONSUMER_SECRET=<something>
KHOROS_NETWORK_TWITTER_AUTH_ACCESS_TOKEN_KEY=<something>
KHOROS_NETWORK_TWITTER_AUTH_ACCESS_TOKEN_SECRET=<something>
KHOROS_NETWORK_FACEBOOK_EXTERNAL_ID=<something>
```

### Run Latest Docker Image

```
docker run -p 3000:3000 -d --env-file .env jolzee/teneo-khoros-webhook:latest
```

## Notes on Building, Running and Pushing Docker Image

```
docker login --username=<username> --email=<email>
docker build -t jolzee/teneo-khoros-webhook .
docker images
docker tag <IMAGE_ID> jolzee/teneo-khoros-webhook:latest
docker run -p 3000:3000 -d --env-file .env jolzee/teneo-khoros-webhook
docker run -p 3000:3000 -it --env-file .env jolzee/teneo-khoros-webhook
docker push jolzee/teneo-khoros-webhook:latest
docker ps
docker logs <conainer id>
## Enter the container
docker exec -it <container id> /bin/bash
```

## Docker Compose

Run with:

```sh
docker-compose up
```

```yml
version: "3"
services:
  teneo-khoros-webhook:
    image: jolzee/teneo-khoros-webhook
    container_name: teneo-khoros-webhook
    ports:
      - "3000:3000"
    env_file:
      - .env
    links:
      - redis
  redis:
    image: "bitnami/redis:latest"
    container_name: redis
    environment:
      - REDIS_PASSWORD=${REDIS_PASSWORD}
    volumes:
      - ./docker/redis-persistence:/bitnami/redis/data
  ngrok:
    image: "wernight/ngrok:latest"
    container_name: ngrok
    command:
      [sh, -c, "echo NGROK Admin URL http://localhost:4040 && /entrypoint.sh"]
    links:
      - teneo-khoros-webhook:http
    ports:
      - "4040:4040"
    environment:
      - NGROK_PORT=teneo-khoros-webhook:3000
      - NGROK_REGION=us
      - NGROK_BINDTLS=true
```

### With inline Environment Variables

```yml
version: "3"
services:
  teneo-khoros-webhook:
    image: jolzee/teneo-khoros-webhook
    container_name: teneo-khoros-webhook
    ports:
      - "3000:3000"
    environment:
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - REDIS_PASSWORD=MySecureRedisPassword
      - TENEO_BOT_NAME=Teneo
      - TENEO_SUPPORT_EMAIL=
      - TENEO_TIE_URL=
      - TENEO_AVATAR_URL=
      - TENEO_CALLBACK_URL=
      - KHOROS_BASE_API_URL=https://api.app.lithium.com/bots/v3
      - KHOROS_BASE_TOKEN_URL=https://<KHOROS_COMPANY_KEY>.response.lithium.com/api/v2/tokens/khorosapi/ownerId/
      - KHOROS_ACCESS_TOKEN_CACHE_KEY=khorosBotAccessToken
      - KHOROS_CREDENTIALS_USERNAME=<myKhorosUsername>
      - KHOROS_CREDENTIALS_PASSWORD=<myKhorosPassword>
      - KHOROS_APP_ID=<appId>
      - KHOROS_COMPANY_KEY=<cmpyKey>
      - KHOROS_NETWORK_TWITTER_EXTERNAL_ID=<something>
      - KHOROS_NETWORK_TWITTER_AUTH_ACCOUNT_ID=<something>
      - KHOROS_NETWORK_TWITTER_AUTH_CONSUMER_KEY=<something>
      - KHOROS_NETWORK_TWITTER_AUTH_CONSUMER_SECRET=<something>
      - KHOROS_NETWORK_TWITTER_AUTH_ACCESS_TOKEN_KEY=<something>
      - KHOROS_NETWORK_TWITTER_AUTH_ACCESS_TOKEN_SECRET=<something>
      - KHOROS_NETWORK_FACEBOOK_EXTERNAL_ID=<something>
    links:
      - redis
  redis:
    image: "bitnami/redis:latest"
    container_name: redis
    environment:
      - REDIS_PASSWORD=${REDIS_PASSWORD}
    volumes:
      - ./docker/redis-persistence:/bitnami/redis/data
  ngrok:
    image: "wernight/ngrok:latest"
    container_name: ngrok
    command:
      [sh, -c, "echo NGROK Admin URL http://localhost:4040 && /entrypoint.sh"]
    links:
      - teneo-khoros-webhook:http
    ports:
      - "4040:4040"
    environment:
      - NGROK_PORT=teneo-khoros-webhook:3000
      - NGROK_REGION=us
      - NGROK_BINDTLS=true
```
