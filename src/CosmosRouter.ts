/**
 * Express Router for the Cosmos DB view.
 * Chris Joakim, Microsoft, 2023
 */

import util from "util";
import multer from "multer";

import { Request, Response, Router } from 'express';
import { ItemResponse, SqlQuerySpec } from "@azure/cosmos";
import { BulkLoadResult, CosmosNoSqlUtil, CosmosNoSqlAccountMeta } from "azu-js";
import { UIHelper } from "./UIHelper";

const router: Router = Router();

const cosmos: CosmosNoSqlUtil = new CosmosNoSqlUtil(
  'AZURE_COSMOSDB_NOSQL_URI',
  'AZURE_COSMOSDB_NOSQL_RW_KEY1');

// local cache files
const NOSQL_DBS_CONTAINERS_LIST = 'tmp/nosql_dbs_containers_list.json';

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
    results_message: '',
    raw_json: '',
    containers: []
  });
})

router.post("/metadata", async (req: Request, res: Response) => {
  let uri: string = '';
  try {
    UIHelper.ensureSession(req);
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
  
    fu.writeTextFileSync('tmp/woven_metadata.json', JSON.stringify(woven, null, 2));
    fu.writeTextFileSync(NOSQL_DBS_CONTAINERS_LIST, JSON.stringify(uiContainers, null, 2));
  
    let containersList: object[] = [];
    res.render('cosmos_metadata', {
      uri: uri,
      containersList: containersList,
      dbname: req.session.dbname,
      cname: req.session.cname,
      results_message: 'Raw Metadata JSON',
      raw_json: raw_json,
      containers: uiContainers
    });
  }
  catch (error) {
      console.log('error in /cosmos/metadata');
  }

  res.render('cosmos_metadata', {
    uri: uri,
    containersList: [],
    dbname: req.session.dbname,
    cname: req.session.cname,
    results_message: '',
    raw_json: '',
    containers: []
  });
})


// ==================== query ====================

router.get("/query", async (req: Request, res: Response) => {
  let dbsContainers: Array<object> = readDatabasesAndContainersList();
  UIHelper.ensureSession(req);
  res.render('cosmos_query', {
    uri: cosmos.acctUri,
    dbs_containers: dbsContainers,
    curr_db_container: req.session.db_container,
    sql: req.session.sql,
    results: '',
    results_message: '',
    diagnostics: null,
    diagnostics_message: ''
  });
})

router.post("/query", async (req: Request, res: Response) => {
  let dbsContainers: Array<object> = readDatabasesAndContainersList();
  UIHelper.ensureSession(req);

  let db_container = req.body.db_container;
  let dbname = db_container.split('|')[0].trim();
  let cname = db_container.split('|')[1].trim();
  let sql = req.body.sql;
  let documents = [];
  let results_message = '';
  let diagnostics: object = {};
  let diagnostics_message = '';

  if (!isQueryFormValid(db_container, sql)) {
    console.log('Invalid query form');
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
        let spec: SqlQuerySpec = {
          query: sql,
          parameters: []
        }
        let feedResp = await cosmos.queryAsync(dbname, cname, spec);
        diagnostics = feedResp.diagnostics;
        diagnostics_message = 'Diagnostics';

        for (const doc of feedResp.resources) {
          documents.push(doc);
        }
        results_message = util.format('Query found %s documents, %s RU', documents.length, feedResp.requestCharge);
      }
    }
    catch (error) {
      console.log(error);
    }
    console.log(JSON.stringify(req.session, null, 2));
  }

  res.render('cosmos_query', {
    uri: cosmos.acctUri,
    dbs_containers: dbsContainers,
    curr_db_container: req.session.db_container,
    dbname: req.session.dbname,
    sql: req.session.sql,
    results: JSON.stringify(documents, null, 2),
    results_message: results_message,
    diagnostics: JSON.stringify(diagnostics, null, 2),
    diagnostics_message: diagnostics_message
  });
})

// ==================== crud ====================

router.get("/crud", async (req: Request, res: Response) => {
  UIHelper.ensureSession(req);
  UIHelper.deleteUploadFiles();

  let dbsContainers: Array<object> = readDatabasesAndContainersList();
  res.render('cosmos_crud', {
    uri: cosmos.acctUri,
    dbs_containers: dbsContainers,
    curr_db_container: req.session.db_container,
    results_visibility: 'hidden',
    results_message: '',
    results: '',
    crud_text: JSON.stringify(UIHelper.sampleCosmosDbNoSqlDocument(), null, 2)
  });
})

router.post("/crud", async (req: Request, res: Response) => {
  UIHelper.ensureSession(req);
  let results_message = '';
  let results = '';
  let crud_text = '';
  let db_container = req.body.db_container;
  let dbname = db_container.split('|')[0].trim();
  let cname = db_container.split('|')[1].trim();
  let op = req.body.crud_operation;

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
          break;
      case "upsert":
          let upsertResp : ItemResponse<Object> = await cosmos.upsertDocumentAsync(dbname, cname, doc);
          crud_text = JSON.stringify(upsertResp.resource, null, 2);
          results_message = util.format(
            'Upsert - statusCode %s, requestCharge %s', 
            upsertResp.statusCode, upsertResp.requestCharge);
          break;
      case "delete":
          let deleteResp : ItemResponse<Object> = await cosmos.deleteDocumentAsync(dbname, cname, doc['id'], doc['pk']);
          crud_text = JSON.stringify(doc, null, 2);  // the document before deletion
          console.log('drr: ' + deleteResp.resource);
          results_message = util.format(
            'Delete - statusCode %s, requestCharge %s', 
            deleteResp.statusCode, deleteResp.requestCharge);
          break;
    }
  }
  catch (error) {
      crud_text = 'Error: ' + error;
      results_message = 'Error';
  }

  let dbsContainers: Array<object> = readDatabasesAndContainersList();
  res.render('cosmos_crud', {
    uri: cosmos.acctUri,
    dbs_containers: dbsContainers,
    curr_db_container: req.session.db_container,
    results_visibility: 'visible',
    results_message: results_message,
    results: results,
    crud_text: crud_text
  });
})

// ==================== upload ====================

router.get("/upload", async (req: Request, res: Response) => {
  UIHelper.ensureSession(req);
  UIHelper.deleteUploadFiles();

  let dbsContainers: Array<object> = readDatabasesAndContainersList();
  res.render('cosmos_upload', {
    uri: cosmos.acctUri,
    dbs_containers: dbsContainers,
    curr_db_container: req.session.db_container,
    results_visibility: 'hidden',
    results_message: '',
    results: ''
  });
})

router.post("/upload", upload.single('file'), async (req: Request, res: Response) => {
  let dbsContainers: Array<object> = readDatabasesAndContainersList();
  let results_message = '';
  let results = '';

  try {
    UIHelper.ensureSession(req);
    let db_container = req.body.upload_db_container;
    let dbname = db_container.split('|')[0].trim();
    let cname = db_container.split('|')[1].trim();
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
        console.log('' + documents.length + ' uploaded.  generateIds: ' + generateIds);
        let blr: BulkLoadResult =
          await cosmos.loadContainerBulkAsync(dbname, cname, 'upsert', documents, generateIds);
        results = JSON.stringify(blr, null, 2);
        UIHelper.deleteUploadFiles();
      }
      catch (error) {
        console.log(error);
        results = 'Error: Unable to parse the uploaded file';
      }
    }
    else {
      results = 'Error: No file uploaded';
    }
  }
  catch (error) {
      console.log('error in post /cosmos/upload');
  }

  res.render('cosmos_upload', {
    uri: cosmos.acctUri,
    dbs_containers: dbsContainers,
    curr_db_container: req.session.db_container,
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

function readDatabasesAndContainersList(): Array<object> {
  try {
    return fu.readJsonArrayFile(NOSQL_DBS_CONTAINERS_LIST);
  }
  catch (error) {
    console.log(error);
    return [];
  }
}

export const CosmosRouter: Router = router;
