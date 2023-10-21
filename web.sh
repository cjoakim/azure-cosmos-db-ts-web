#!/bin/bash

# Script to start the Express server locally.
# Chris Joakim, Microsoft, 2023

tsc

DEBUG=azure-cosmos-db-ts-web:* nodemon build/index.js
