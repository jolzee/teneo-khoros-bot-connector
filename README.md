# teneo-khoros-bot-connector

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
