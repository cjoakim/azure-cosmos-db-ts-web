# az CLI script to create an Azure Container Instance (ACI)
# for the azure-cosmos-db-ts-web (aka - cosmos db +).
# Chris Joakim, Microsoft, March 2023

# Parameters - change these per your Azure environment
$subscription=$Env:AZURE_SUBSCRIPTION_ID
$resource_group='cosmosdbplus'
$resource_name='cosmosdbplus'
$azure_location='eastus'

# Parameters - standard
$image_name="cjoakim/azure-cosmos-db-ts-web-prod:latest"

New-Item -ItemType Directory -Force -Path .\tmp | out-null

az group delete `
    --name         $resource_group `
    --subscription $subscription `
    --yes

Start-Sleep -Seconds 10

az group create `
    --location     $azure_location `
    --name         $resource_group `
    --subscription $subscription

Start-Sleep -Seconds 10

az container create `
    --resource-group $resource_group `
    --name  $resource_name `
    --image $image_name `
    --cpu   2 `
    --memory 8.0 `
    --dns-name-label $resource_name `
    --ports 3000 `
    --os-type Linux `
    --restart-policy Always `
    --environment-variables DEBUG=azure-cosmos-db-ts-web:* PORT=3000 AZURE_WEB_AUTH_USERS=$Env:AZURE_WEB_AUTH_USERS AZURE_COSMOSDB_NOSQL_URI=$Env:AZURE_COSMOSDB_NOSQL_URI AZURE_COSMOSDB_NOSQL_RW_KEY1=$Env:AZURE_COSMOSDB_NOSQL_RW_KEY1 AZURE_OPENAI_URL=$Env:AZURE_OPENAI_URL AZURE_OPENAI_KEY1=$Env:AZURE_OPENAI_KEY1 AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT=$Env:AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT AZURE_SEARCH_URL=$Env:AZURE_SEARCH_URL AZURE_SEARCH_NAME=$Env:AZURE_SEARCH_NAME AZURE_SEARCH_ADMIN_KEY=$Env:AZURE_SEARCH_ADMIN_KEY AZURE_SEARCH_QUERY_KEY=$Env:AZURE_SEARCH_QUERY_KEY > tmp\provision.json

az container show --resource-group $resource_group --name $resource_name > tmp\show.json
