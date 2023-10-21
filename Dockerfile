FROM node:18-alpine

# Create app directory
RUN mkdir -p /app
RUN mkdir -p /app/build
RUN mkdir -p /app/tmp
RUN mkdir -p /app/uploads

ENV PATH /app/node_modules/.bin:$PATH 

WORKDIR /app
#USER node

# Bundle app source
COPY . /app

# Install app dependencies
COPY package.json /app
RUN  npm install
RUN  date > public/build-date.txt 
RUN  npm list > public/npm-list.txt

RUN  date > tmp/build-date.txt 
RUN  date > uploads/build-date.txt 

EXPOSE 3000
CMD [ "node", "build/index.js" ]
# CMD [ "npm", "start" ]

# Docker Commands:
# docker build -t cjoakim/azure-cosmos-db-ts-web . 
# docker scout quickview
# docker image ls cjoakim/azure-cosmos-db-ts-web:latest
# docker run --rm cjoakim/azure-cosmos-db-ts-web:latest ls -alR > tmp/docker-container-contents.txt
# docker run -d -e PORT=3000 -p 3000:3000 cjoakim/azure-cosmos-db-ts-web:latest
# docker ps
# docker stop -t 2 86b125ed43e5  (where 86b125ed43e5 is the CONTAINER ID from 'docker ps')

# docker compose -f docker-compose-web.yml up

# Docker Hub:
# docker push cjoakim/azure-cosmos-db-ts-web:latest

# Azure Container Registry:
# az acr login --name youracr
# docker tag cjoakim/azure-cosmos-db-ts-web:latest cjoakimacr.azurecr.io/azure-cosmos-db-ts-web:latest
# docker push youracr.azurecr.io/azure-cosmos-db-ts-web:latest
# az acr repository list --name youracr --output table
