/**
 * Express Router for the Cosmos DB view.
 * Chris Joakim, Microsoft, 2023
 */

import util from "util";
import multer from "multer";

import { Request, Response, Router } from 'express';
import { ItemResponse, SqlQuerySpec, PatchOperation, PatchOperationType } from "@azure/cosmos";
import { BulkLoadResult, CosmosNoSqlUtil, CosmosNoSqlAccountMeta } from "azu-js";
import { UIHelper } from "./UIHelper";

const router: Router = Router();

const cosmos: CosmosNoSqlUtil = new CosmosNoSqlUtil(
  'AZURE_COSMOSDB_NOSQL_URI',
  'AZURE_COSMOSDB_NOSQL_RW_KEY1');

const GET_COSMOS_DB_METADATA_URL = '/cosmos/metadata';
const GET_COSMOS_DB_UPLOAD_URL   = '/cosmos/upload';
const GET_COSMOS_DB_QUERY_URL    = '/cosmos/query';
const GET_COSMOS_DB_CRUD_URL     = '/cosmos/crud';

const upload = multer({ dest: UIHelper.uploadsDir() });
const fu = UIHelper.fileUtil();

// ==================== metadata ====================

router.get("/metadata", async (req: Request, res: Response) => {
  UIHelper.ensureSession(req);
  let uri: string = '';
  try {
    uri = cosmos.acctUri;
  }
  catch (error) {
    console.log(error);
  }

  let containersList: object[] = [];
  res.render('cosmos_metadata', {
    uri: uri,
    containersList: containersList,
    dbname: req.session.dbname,
    cname: req.session.cname,
    error_message: '',
    results_message: '',
    raw_json: '',
    containers: []
  });
})

router.post("/metadata", async (req: Request, res: Response) => {
  UIHelper.ensureSession(req);
  let uri: string = '';
  let error_message = '';
  try {
    try {
      uri = cosmos.acctUri;
    }
    catch (error) {
      console.log(error);
    }
    let meta: CosmosNoSqlAccountMeta = await cosmos.getAccountMetadataAsync();
    let woven = meta.weave();
    let raw_json = JSON.stringify(woven, null, 2);
    let uiContainers = [];
    woven.forEach(db => {
      let dbName = db['id'];
      let containers = db['containers'];
      let dbThroughput = db['throughput'];
      containers.forEach(c => {
        let cName = c['id'];
        let sortKey = dbName + ' | ' + cName;
        let pk = c['partitionKey'].join(' ');
        let ttl = c['defaultTtl'];
        let attl = c['analyticalTtl'];
        let cThroughput = c['throughput'];
        let throughput = null;
        if (cThroughput == null) {
          pruneThroughput(dbThroughput);
          throughput = 'database level: ' + JSON.stringify(dbThroughput, null, 2);
        }
        else {
          pruneThroughput(cThroughput);
          throughput = 'container level: ' + JSON.stringify(cThroughput, null, 2);
        }
        uiContainers.push({
          sortKey: sortKey,
          dbName: dbName,
          cName: cName,
          pk: pk,
          ttl: ttl,
          attl: attl,
          throughput: throughput
        });
      });
    });
    uiContainers.sort(function (a, b) { return (a.sortKey > b.sortKey) ? 1 : ((b.sortKey > a.sortKey) ? -1 : 0); });
    fu.writeTextFileSync(noSqlDbsContainersFile(req), JSON.stringify(uiContainers, null, 2));
  
    let containersList: object[] = [];
    res.render('cosmos_metadata', {
      uri: uri,
      containersList: containersList,
      dbname: req.session.dbname,
      cname: req.session.cname,
      error_message: error_message,
      results_message: 'Raw Metadata JSON',
      raw_json: raw_json,
      containers: uiContainers
    });
  }
  catch (error) {
    error_message = 'Error in reading or processing metadata';
    console.log('error in /cosmos/metadata');
  }

  res.render('cosmos_metadata', {
    uri: uri,
    containersList: [],
    dbname: req.session.dbname,
    cname: req.session.cname,
    error_message: '',
    results_message: '',
    raw_json: '',
    containers: []
  });
})

// ==================== query ====================

router.get("/query", async (req: Request, res: Response) => {
  let dbsContainers: Array<object> = readDatabasesAndContainersList(req);
  if (dbsContainers.length < 1) {
    res.redirect(GET_COSMOS_DB_METADATA_URL);
    return;
  }
  UIHelper.ensureSession(req);
  res.render('cosmos_query', {
    uri: cosmos.acctUri,
    dbs_containers: dbsContainers,
    curr_db_container: req.session.db_container,
    sql: req.session.sql,
    error_message: '',
    results: '',
    results_message: '',
    diagnostics: null,
    diagnostics_message: ''
  });
})

router.post("/query", async (req: Request, res: Response) => {
  let dbsContainers: Array<object> = readDatabasesAndContainersList(req);
  if (dbsContainers.length < 1) {
    res.redirect(GET_COSMOS_DB_METADATA_URL);
    return;
  }
  let db_container = req.body.db_container;
  if (!db_container || db_container.trim().length < 1) {
    res.redirect(GET_COSMOS_DB_QUERY_URL);
    return;
  }
  UIHelper.ensureSession(req);

  let dbname = db_container.split('|')[0].trim();
  let cname  = db_container.split('|')[1].trim();
  let sql = req.body.sql;
  let documents = [];
  let error_message = '';
  let results_message = '';
  let diagnostics: object = {};
  let diagnostics_message = '';

  if (!isQueryFormValid(db_container, sql)) {
    error_message = 'Invalid query form';
  }
  else {
    UIHelper.logBody(req);
    req.session.db_container = db_container;
    req.session.dbname = dbname
    req.session.cname = cname;
    req.session.sql = sql;
    try {
      if (sql.trim().split(' ').length == 2) {
        // Execute a Point-Read
        let tokens = sql.trim().split(' ');
        let id = tokens[0];
        let pk = tokens[1];
        let readResp: ItemResponse<Object> = await cosmos.pointReadAsync(dbname, cname, id, pk);
        if (readResp.statusCode == 200) {
          documents.push(readResp.resource);
          diagnostics = readResp.diagnostics;
          diagnostics_message = 'Diagnostics';
        }
        if (documents.length == 0) {
          results_message = 'Point-read, document not found';
        }
        else {
          results_message = util.format('Point-read, document found, %s RU', readResp.requestCharge);
        }
      }
      else {
        // Execute a Query
        if (sql.trim().toLowerCase().startsWith('select ')) {
          let spec: SqlQuerySpec = { query: sql, parameters: [] }
          let feedResp = await cosmos.queryAsync(dbname, cname, spec);
          diagnostics = feedResp.diagnostics;
          diagnostics_message = 'Diagnostics';
          for (const doc of feedResp.resources) {
            documents.push(doc);
          }
          results_message = util.format('Query found %s documents, %s RU', documents.length, feedResp.requestCharge);
        }
        else {
          error_message = 'Query SQL must begin with "select"';
        }
      }
    }
    catch (error) {
      console.log(error);
      error_message = 'Error executing query';
    }
  }

  res.render('cosmos_query', {
    uri: cosmos.acctUri,
    dbs_containers: dbsContainers,
    curr_db_container: req.session.db_container,
    dbname: req.session.dbname,
    sql: req.session.sql,
    error_message: error_message,
    results: JSON.stringify(documents, null, 2),
    results_message: results_message,
    diagnostics: JSON.stringify(diagnostics, null, 2),
    diagnostics_message: diagnostics_message
  });
})

// ==================== crud ====================

router.get("/crud", async (req: Request, res: Response) => {
  let dbsContainers: Array<object> = readDatabasesAndContainersList(req);
  let diagnostics: object = {};
  let diagnostics_message = '';

  if (dbsContainers.length < 1) {
    res.redirect(GET_COSMOS_DB_METADATA_URL);
    return;
  }
  UIHelper.ensureSession(req);
  UIHelper.deleteUploadFiles();

  res.render('cosmos_crud', {
    uri: cosmos.acctUri,
    dbs_containers: dbsContainers,
    curr_db_container: req.session.db_container,
    results_visibility: 'hidden',
    error_message: '',
    results_message: '',
    results: '',
    patch_attributes: '',
    crud_text: JSON.stringify(UIHelper.sampleCosmosDbNoSqlDocument(), null, 2),
    diagnostics: null,
    diagnostics_message: ''
  });
})

router.post("/crud", async (req: Request, res: Response) => {
  let dbsContainers: Array<object> = readDatabasesAndContainersList(req);
  if (dbsContainers.length < 1) {
    res.redirect(GET_COSMOS_DB_METADATA_URL);
    return;
  }
  let db_container = req.body.db_container;
  if (!db_container || db_container.trim().length < 1) {
    res.redirect(GET_COSMOS_DB_CRUD_URL);
    return;
  }
  UIHelper.ensureSession(req);
  let error_message = '';
  let diagnostics: object = {};
  let diagnostics_message = '';
  let dbname = db_container.split('|')[0].trim();
  let cname  = db_container.split('|')[1].trim();
  let patch_attributes = req.body.patch_attributes.trim();
  let op = req.body.crud_operation;
  let results_message = '';
  let results = '';
  let crud_text = '';

  console.log(db_container);
  console.log(dbname);
  console.log(cname);
  req.session.db_container = db_container;
  req.session.dbname = dbname
  req.session.cname = cname;

  try {
    let doc = JSON.parse(req.body.crud_text); // was validated client-side with JavaScript
    switch (op) {
      case "create":
          let createResp : ItemResponse<Object> = await cosmos.insertDocumentAsync(dbname, cname, doc);
          crud_text = JSON.stringify(createResp.resource, null, 2);
          results_message = util.format(
            'Create - statusCode %s, requestCharge %s', 
            createResp.statusCode, createResp.requestCharge);
            diagnostics = createResp.diagnostics;
            diagnostics_message = 'Diagnostics';
          break;
      case "upsert":
          let upsertResp : ItemResponse<Object> = await cosmos.upsertDocumentAsync(dbname, cname, doc);
          crud_text = JSON.stringify(upsertResp.resource, null, 2);
          results_message = util.format(
            'Upsert - statusCode %s, requestCharge %s', 
            upsertResp.statusCode, upsertResp.requestCharge);
          diagnostics = upsertResp.diagnostics;
          diagnostics_message = 'Diagnostics';
          break;
      case "patch":
          UIHelper.logBody(req);
          let id = doc['id'];
          let partitionKey = lookupPartitionKeyAttr(req, dbname, cname);
          let partitionKeyValue = doc[partitionKey];
          console.log(util.format('patch - dbname: %s, cname: %s, id: %s, partitionKey: %s, partitionKeyValue: %s',
            dbname, cname, id, partitionKey, partitionKeyValue));
          let patchOperations = buildPatchOperations(doc, patch_attributes);
          console.log('patchOperations -> ' + JSON.stringify(patchOperations, null, 2));
          let patchResp : ItemResponse<Object> = 
            await cosmos.patchDocumentAsync(
              dbname, cname, id, partitionKeyValue, patchOperations);
          crud_text = JSON.stringify(patchResp.resource, null, 2);
          results_message = util.format(
              'Patch - statusCode %s, requestCharge %s', 
              patchResp.statusCode, patchResp.requestCharge);
          results = "Patch Operations:\n" + JSON.stringify(patchOperations, null, 2);
          diagnostics = patchResp.diagnostics;
          diagnostics_message = 'Diagnostics';
          break;
      case "delete":
          let deleteResp : ItemResponse<Object> = await cosmos.deleteDocumentAsync(dbname, cname, doc['id'], doc['pk']);
          crud_text = JSON.stringify(doc, null, 2);  // the document before deletion
          console.log('drr: ' + deleteResp.resource);
          results_message = util.format(
            'Delete - statusCode %s, requestCharge %s', 
            deleteResp.statusCode, deleteResp.requestCharge);
          diagnostics = deleteResp.diagnostics;
          diagnostics_message = 'Diagnostics';
          break;
    }
  }
  catch (error) {
      crud_text = 'Error: ' + error;
      results_message = 'Error performing operation: ' + op;
  }

  res.render('cosmos_crud', {
    uri: cosmos.acctUri,
    dbs_containers: dbsContainers,
    curr_db_container: req.session.db_container,
    error_message: error_message,
    results_visibility: 'visible',
    results_message: results_message,
    results: results,
    patch_attributes: patch_attributes,
    crud_text: crud_text,
    diagnostics: JSON.stringify(diagnostics, null, 2),
    diagnostics_message: diagnostics_message
  });
})

// ==================== upload ====================

router.get("/upload", async (req: Request, res: Response) => {
  let dbsContainers: Array<object> = readDatabasesAndContainersList(req);
  if (dbsContainers.length < 1) {
    res.redirect(GET_COSMOS_DB_METADATA_URL);
    return;
  }
  UIHelper.ensureSession(req);
  UIHelper.deleteUploadFiles();

  res.render('cosmos_upload', {
    uri: cosmos.acctUri,
    dbs_containers: dbsContainers,
    curr_db_container: req.session.db_container,
    error_message: '',
    results_visibility: 'hidden',
    results_message: '',
    results: ''
  });
})

router.post("/upload", upload.single('file'), async (req: Request, res: Response) => {
  let dbsContainers: Array<object> = readDatabasesAndContainersList(req);
  if (dbsContainers.length < 1) {
    res.redirect(GET_COSMOS_DB_METADATA_URL);
    return;
  }
  let error_message = '';
  let results_message = '';
  let results = '';

  try {
    UIHelper.ensureSession(req);
    let db_container = req.body.upload_db_container;
    if (!db_container || db_container.trim().length < 1) {
      res.redirect(GET_COSMOS_DB_UPLOAD_URL);
      return;
    }
    let dbname = db_container.split('|')[0].trim();
    let cname  = db_container.split('|')[1].trim();
    results_message = 'Upload Results';
    let generateIds = false;
    if (req.body.genIdsCheckbox) {
      if (req.body.genIdsCheckbox === 'yes') {
        generateIds = true;
      }
    }
    req.session.db_container = db_container;
    req.session.dbname = dbname
    req.session.cname = cname;
  
    if (req.file && req.file.path) {
      try {
        let documents = fu.readJsonArrayFile(req.file.path);
        if (documents) {
          console.log('' + documents.length + ' uploaded.  generateIds: ' + generateIds);
          let blr: BulkLoadResult =
            await cosmos.loadContainerBulkAsync(dbname, cname, 'upsert', documents, generateIds);
          results = JSON.stringify(blr, null, 2);
          UIHelper.deleteUploadFiles();
        }
        else {
          error_message = 'Error: Unable to parse the uploaded file.  Is it a JSON Array of Objects?';
          console.log(error_message);
        }
      }
      catch (error) {
        console.log(error);
        error_message = 'Error: Unable to process the uploaded file';
      }
    }
    else {
      error_message = 'Error: No file uploaded';
    }
  }
  catch (error) {
      console.log('error in post /cosmos/upload');
      error_message = 'Error: Unable to process the uploaded file.  Is it a JSON Array of Objects?';
  }

  res.render('cosmos_upload', {
    uri: cosmos.acctUri,
    dbs_containers: dbsContainers,
    curr_db_container: req.session.db_container,
    error_message: error_message,
    results_visibility: 'visible',
    results_message: results_message,
    results: results
  });
})

// ==================== private functions ====================

function pruneThroughput(throughput: object): void {
  try {
    if (throughput['offerAutopilotSettings']) {
      delete throughput['offerAutopilotSettings']['tier'];
      delete throughput['offerAutopilotSettings']['autoUpgrade'];
      delete throughput['offerAutopilotSettings']['maximumTierThroughput'];
    }
    delete throughput['isOfferReplacePending'];
    delete throughput['isOfferReplacePendingForMerge'];
    delete throughput['isOfferRestorePending'];
  }
  catch (error) {
      console.log('error in pruneThroughput');
  }
}

function isQueryFormValid(db_container: string, sql: string): boolean {
  try {
    if (db_container == null || db_container.trim().length > 0) {
      if (sql == null || sql.trim().length > 0) {
        return true;
      }
    }
  }
  catch (error) {
      console.log('error in isQueryFormValid');
  }
  return false;
}

function noSqlDbsContainersFile(req: Request): string {
  try {
    return util.format('tmp/nosql_dbs_containers_%s.json', UIHelper.sessionId(req));
  }
  catch (error) {
    return 'tmp/nosql_dbs_containers.json';
  }
}

function readDatabasesAndContainersList(req: Request): Array<object> {
  try {
    let infile = noSqlDbsContainersFile(req);
    let array  = fu.readJsonArrayFile(infile);
    return Array.isArray(array) ? array : [];
  }
  catch (error) {
    console.log(error);
    return [];
  }
}

function lookupPartitionKeyAttr(req: Request, dbname : string, cname: string) : string {
  try {
    let dbsContainers: Array<object> = readDatabasesAndContainersList(req);
    let key = '' + dbname + ' | ' + cname;
    //console.log('lookupPartitionKeyAttr key: ' + key + ', dbsContainers.length: ' + dbsContainers.length);
    for (var i = 0; i < dbsContainers.length; i++) {
      let dbc = dbsContainers[i];
      if (dbc['sortKey'] == key) {
        return dbc['pk'].replace('/','');
      }
    }
  }
  catch (error) {
      console.log('error in lookupPartitionKeyAttr');
  }
  return 'pk';  // default
}

function buildPatchOperations(doc : object, patch_attributes : string) : Array<PatchOperation> {
  let operations = new Array<PatchOperation>();
  let patch_attributes_list = patch_attributes.split(' ');

  for (var i = 0; i < patch_attributes_list.length; i++) {
    let attrWithOp = patch_attributes_list[i].trim();  // examples: '+name', '-name', or just 'name'
    let attr = patch_attributes_list[i].trim();
    let opName = 'replace';

    if (attrWithOp.startsWith('+')) {
      opName = 'add';
      attr = attrWithOp.replace('+', '');
    }
    if (attrWithOp.startsWith('-')) {
      opName = 'remove';
      attr = attrWithOp.replace('-', '');
    }

    switch (opName) {
      case "add":
        operations.push({op: PatchOperationType.add, value: doc[attr], path:  '/' + attr});
          break;
      case "replace":
        operations.push({op: PatchOperationType.replace, value: doc[attr], path:  '/' + attr});
          break;
      case "remove":
        operations.push({op: PatchOperationType.remove, path:  '/' + attr});
          break;
    }
  }
  return operations;
}


export const CosmosRouter: Router = router;
