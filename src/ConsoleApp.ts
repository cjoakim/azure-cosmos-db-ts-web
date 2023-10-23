/**
 * This class is a "console application" executed from a command-line, 
 * and thus is NOT part of the web application.
 * See file 'cogsearch_baseballplayers_create.ps1' where it is invoked.
 * 
 * Chris Joakim, Microsoft, 2023
 */

import util from "util";

import { FileUtil, CogSearchUtil } from "azu-js";

export interface CogSearchResponse {
    url:      string;
    method:   string;
    body:     string;
    status:   number;
    respData: object;
    error:    boolean;
}

let func = process.argv[2];
let fu   = new FileUtil();

console.log('========================================');
console.log(util.format('function: %s', func));

switch (func) {
    case "search":
        search();
        break;
    default:
        console.log(util.format('unknown command-line function: %s', func));
        break;
}

async function search() {
    let subfunc = process.argv[3];
    let apiVersion : string = '2023-07-01-Preview';
    let name : string = null;
    let searchName   : string = null;
    let searchDict   : object = null;
    let searchParams : object = null;
    let schemaFile   : string = null;
    let playerId     : string = null;
    let resp : CogSearchResponse = null;

    // Pass in YOUR environment variable names which contain these values.
    let csu : CogSearchUtil = new CogSearchUtil(
        'AZURE_SEARCH_URL',
        'AZURE_SEARCH_NAME',
        'AZURE_SEARCH_ADMIN_KEY',
        'AZURE_SEARCH_QUERY_KEY',
        apiVersion,
        true);

    switch (subfunc) {
        case "delete_datasource":
            resp = await csu.deleteDatasource(process.argv[4]);
            console.log(JSON.stringify(resp, null, 2));
            break;
        case "delete_index":
            resp = await csu.deleteIndex(process.argv[4]);
            console.log(JSON.stringify(resp, null, 2));
            break;
        case "delete_indexer":
            resp = await csu.deleteIndexer(process.argv[4]);
            console.log(JSON.stringify(resp, null, 2));
            break;
        case "create_cosmos_nosql_datasource":
            let accountNameEnvVarName = process.argv[4];
            let accountKeyEnvVarName = process.argv[5];
            let dbname = process.argv[6];
            let collection = process.argv[7];
            resp = await csu.createCosmosNoSqlDatasource(accountNameEnvVarName, accountKeyEnvVarName, dbname, collection);
            console.log(JSON.stringify(resp, null, 2));
            break;
        case "create_index":
            name = process.argv[4];
            schemaFile = process.argv[5];
            resp = await csu.createIndex(name, schemaFile);
            console.log(JSON.stringify(resp, null, 2));
            break;
        case "create_indexer":
            name = process.argv[4];
            schemaFile = process.argv[5];
            resp = await csu.createIndexer(name, schemaFile);
            console.log(JSON.stringify(resp, null, 2));
            break;
        case "get_indexer_status":
            name = process.argv[4];
            resp = await csu.getIndexerStatus(name);
            console.log(JSON.stringify(resp, null, 2));
            break;
        case "list_datasources":
            resp = await csu.listDatasources();
            console.log(JSON.stringify(resp, null, 2));
            break;
        case "list_indexes":
            resp = await csu.listIndexes();
            console.log(JSON.stringify(resp, null, 2));
            break;
        case "list_indexers":
            resp = await csu.listIndexers();
            console.log(JSON.stringify(resp, null, 2));
            break;
        case "named_search":
            searchDict = fu.readJsonObjectFile('cogsearch/named_searches.json');
            name = process.argv[4];
            searchName = process.argv[5];
            searchParams = searchDict[searchName];
            resp = await csu.searchIndex(name, searchParams);
            console.log(JSON.stringify(resp, null, 2));
            break;
        case "vector_search":
            // First lookup the named player to get their embedding value 
            name = process.argv[4];
            playerId = process.argv[5];
            let lookupParams = {
                "count":   "true",
                "search":  "playerID eq 'xxx'",
                "orderby": "playerID",
                "select":  "id,playerID,nameFirst,nameLast,primary_position,embeddings_str,embeddings"
            }
            lookupParams['search'] = util.format("playerID eq '%s'", playerId);
            let lookupResp = await csu.searchIndex(name, lookupParams);
            //console.log(JSON.stringify(resp, null, 2));

            if (lookupResp.status == 200) {
                // Construct the vector search parameters, then execute the vector search
                let embeddings = lookupResp.respData['value'][0]['embeddings'];
                let vectorSearchParams = {};
                let vector = {};
                vector['value'] = embeddings
                vector['fields'] = 'embeddings'
                vector['k'] = 10
                vectorSearchParams['count'] = "true";
                vectorSearchParams['select'] = 'id,playerID,nameFirst,nameLast,primary_position';
                vectorSearchParams['orderby'] = "playerID";
                vectorSearchParams['vectors'] = [ vector ];
                let vectorSearchResp = await csu.searchIndex(name, vectorSearchParams);
                console.log(JSON.stringify(vectorSearchResp, null, 2));
            }
            break;
        default:
            console.log(util.format("search, unknown subfunction: %s", subfunc));
            break;
    }
}
