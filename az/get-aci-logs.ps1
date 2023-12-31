# az CLI script to download the logs for this Azure Container Instance (ACI)
# web application.
# Chris Joakim, Microsoft, March 2023

# Parameters - change these per your Azure environment
$subscription=$Env:AZURE_SUBSCRIPTION_ID
$resource_group='cosmosdbplus'
$resource_name='cosmosdbplus'
$azure_location='eastus'

New-Item -ItemType Directory -Force -Path .\tmp | out-null

# Parameters - standard
$container_name="cjoakim/azure-cosmos-db-ts-web:latest"

echo 'az container logs...'
az container logs `
    --resource-group $resource_group `
    --name  $resource_name > tmp\cosmosdbplus-logs.json
