# Script to start the Express server locally.
# Chris Joakim, Microsoft, 2023

$env:DEBUG='azure-cosmos-db-ts-web:*'

tsc

nodemon build/index.js
