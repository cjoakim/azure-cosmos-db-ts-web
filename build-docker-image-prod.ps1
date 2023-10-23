# Script to build the Docker prod image.
#
# Chris Joakim, Microsoft, 2023

.\build.ps1

del tmp\*.*
del uploads\*.*

tsc 

echo 'docker build...'
docker build -t cjoakim/azure-cosmos-db-ts-web-prod .

echo 'docker ls image...'
docker image ls cjoakim/azure-cosmos-db-ts-web-prod:latest

echo 'next: docker push cjoakim/azure-cosmos-db-ts-web-prod:latest'
