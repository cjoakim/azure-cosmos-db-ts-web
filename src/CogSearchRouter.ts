/**
 * Express Router for the Azure Cognitive Search view.
 * Chris Joakim, Microsoft, 2023
 */

import { Request, Response, Router } from 'express';
import { CogSearchUtil, CogSearchResponse } from "azu-js";
import { UIHelper } from "./UIHelper";

const router: Router = Router();

const cogSearchUtil: CogSearchUtil =
  new CogSearchUtil(
    'AZURE_SEARCH_URL',
    'AZURE_SEARCH_NAME',
    'AZURE_SEARCH_ADMIN_KEY',
    'AZURE_SEARCH_QUERY_KEY',
    '2023-07-01-Preview');

const uri = process.env.AZURE_SEARCH_URL;

router.get("/", async (req: Request, res: Response) => {
  UIHelper.ensureSession(req);
  let index_name = req.session.index_name;

  res.render('cogsearch', {
    uri: uri,
    index_name: req.session.cog_search_index,
    text: req.session.cog_search,
    results_visibility: 'hidden',
    results: ''
  });
})

router.post("/", async (req: Request, res: Response) => {
  let index_name = req.body.index_name;
  let text = req.body.text;
  let results = '';
  let results_visibility = 'hidden';

  try {
    UIHelper.ensureSession(req);
    UIHelper.logBody(req);
    if (queryFormIsValid(index_name, text)) {
      try {
        req.session.cog_search_index = index_name;
        req.session.cog_search = text;
        let searchObj = UIHelper.parseJson(text);
        let csr: CogSearchResponse = await cogSearchUtil.searchIndex(index_name, searchObj);
        if (csr) {
          results = JSON.stringify(csr, null, 2);
          results_visibility = 'visible';
        }
      }
      catch (error) {
        console.log(error);
        results = 'Error processing this search';
      }
    }
    else {
      results = 'Invalid search criteria';
    }
  }
  catch (error) {
    results = 'Error processing this search';
  }

  res.render('cogsearch', {
    uri: uri,
    index_name: index_name,
    text: req.session.cog_search,
    results_visibility: results_visibility,
    results: results
  });
})

function queryFormIsValid(index_name: string, text: string): boolean {
  if (index_name) {
    if (text) {
      if (index_name.trim().length > 0) {
        if (text.trim().length > 0) {
          try {
            let searchObj = UIHelper.parseJson(text);
            return true;
          }
          catch (error) {
              // ignore
          }
        }
      }
    }
  }
  return false;
}

export const CogSearchRouter: Router = router;
