#!/bin/bash

# Script to install and list the npm packages for this app.
#
# Chris Joakim, Microsoft, 2023

rm -rf ./node_modules
rm package-lock.json

mkdir -p ./uploads
mkdir -p ./tmp

npm install

npm list
