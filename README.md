# teneo-khoros-bot-connector

[GitHub](https://github.com/jolzee/teneo-khoros-bot-connector)

## `.env` Environment Variables

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

## Run latest docker image

```
docker run -p 3000:3000 -d --env-file .env jolzee/teneo-khoros-webhook:latest
```

## Notes on Building, Running and Pushing

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
