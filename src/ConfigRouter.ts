/**
 * Express Router for the Configuration view.
 * Chris Joakim, Microsoft, 2023
 */

import { Request, Response, Router } from 'express';
import { UIHelper } from "./UIHelper";

const router: Router = Router();

const requiredEnvVars: string[] = [
  "AZURE_COSMOSDB_NOSQL_URI",
  "AZURE_COSMOSDB_NOSQL_RW_KEY1",
  "AZURE_OPENAI_URL",
  "AZURE_OPENAI_KEY1",
  "AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT",
  "AZURE_SEARCH_URL",
  "AZURE_SEARCH_NAME",
  "AZURE_SEARCH_ADMIN_KEY",
  "AZURE_SEARCH_QUERY_KEY",
  "AZURE_WEB_AUTH_USERS",
  "AZURE_WEB_COOKIE_KEYS",
  "AZURE_WEB_COOKIE_AGE"
];

const secretNameFragments : string[] = [ 'KEY', 'USERS'];

router.get("/", async (req: Request, res: Response) => {
  UIHelper.ensureSession(req);
  let envVarsList: object[] = [];
  let error_message = '';
  try {
    for (let requiredEnvVar of requiredEnvVars.sort()) {
      let obj = {};
      obj['name'] = requiredEnvVar;
      obj['value'] = '' + process.env[requiredEnvVar]; // default to full value
      
      if (envvarContainsSecret(requiredEnvVar)) {
        obj['value'] = obj['value'].substring(0, 4) + '...'; // truncate secrets
      }
      else {
        if (requiredEnvVar.includes('CONN_STR')) {
          obj['value'] = obj['value'].substring(0, 25) + '...'; // truncate connection strings
        }
      }
      envVarsList.push(obj);
    }
  }
  catch (error) {
      error_message = 'Error processing this request';
  }

  res.render('config', {
    envVarsList: envVarsList,
    error_message: error_message,
    db_container: req.session.db_container,
    session_id: UIHelper.sessionId(req)
  });
})

function envvarContainsSecret(envvarName : string): boolean {
  let bool = false;
  for (let fragment of secretNameFragments) {
    if (envvarName.includes(fragment)) {
      bool = true;
    }
  }
  return bool;
}

export const ConfigRouter: Router = router;
