# Delete and recreate the Azure Cognitive Search. baseballplayers indexing -
# delete and recreate the Cosmos DB datasource, the index, and the indexer.
#
# Note: delete in the sequence of indexer, index, datasourcebuild/
# but recreate in the opposite sequence of datasource, index, indexer
#
# Chris Joakim, Microsoft, 2023

echo 'compiling...'
tsc 

echo 'displaying env vars...'
env | grep AZURE_COSMOSDB_NOSQL_ACCT
env | grep AZURE_COSMOSDB_NOSQL_RO_KEY1
env | grep AZURE_SEARCH_ | sort 
echo 'note: be sure that your keys have not expired per your azure policy'

Write-Output 'deleting output tmp/search* files ...'
New-Item -ItemType Directory -Force -Path .\tmp | out-null
del tmp\search*.*

Write-Output '=== delete_indexer'
node build/ConsoleApp.js search delete_indexer baseballplayers > tmp/search_delete_indexer.txt
sleep 10

Write-Output '=== delete_index'
node build/ConsoleApp.js search delete_index baseballplayers > tmp/search_delete_index.txt
sleep 10

Write-Output '=== delete_datasource'
node build/ConsoleApp.js search delete_datasource cosmosdb-nosql-dev-baseballplayers > tmp/search_delete_datasource.txt
sleep 30

Write-Output '=== create_cosmos_nosql_datasource'
node build/ConsoleApp.js search create_cosmos_nosql_datasource AZURE_COSMOSDB_NOSQL_ACCT AZURE_COSMOSDB_NOSQL_RO_KEY1 dev baseballplayers > tmp/search_create_datasource.txt
sleep 20

Write-Output '=== create_index'
node build/ConsoleApp.js search create_index baseballplayers cogsearch\baseballplayers_index.json > tmp/search_create_index.txt
sleep 20

Write-Output '=== create_indexer'
node build/ConsoleApp.js search create_indexer baseballplayers cogsearch\baseballplayers_indexer.json > tmp/search_create_indexer.txt
sleep 20

Write-Output '=== get_indexer_status'
node build/ConsoleApp.js search get_indexer_status baseballplayers > tmp/search_get_indexer_status.txt
sleep 20

Write-Output '=== list_datasources'
node build/ConsoleApp.js search list_datasources > tmp/search_list_datasources.txt
sleep 5

Write-Output '=== list_indexes'
node build/ConsoleApp.js search list_indexes > tmp/search_list_indexes.txt
sleep 5

Write-Output '=== list_indexers'
node build/ConsoleApp.js search list_indexers > tmp/search_list_indexers.txt

Write-Output '=== named_search baseballplayers jeterde01_full'
node build/ConsoleApp.js search named_search baseballplayers jeterde01_full > tmp/search_named_search_jeterde01_full.txt

echo 'done'
