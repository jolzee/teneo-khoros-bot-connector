FROM node:13.8

WORKDIR /opt/teneo-khoros-webhook
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
ENTRYPOINT ["npm", "start"]

# docker login --username=jolzee --email=jolzee@gmail.com
# docker build -t jolzee/teneo-khoros-webhook .
# docker images
# docker tag <IMAGE_ID> jolzee/teneo-khoros-webhook:latest
# docker run -p 3000:3000 -d jolzee/teneo-khoros-webhook
# docker ps
# docker logs <conainer id>
## Enter the container
# docker exec -it <container id> /bin/bash