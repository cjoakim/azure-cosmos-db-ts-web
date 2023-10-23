/**
 * Express Router for the OpenAI view.
 * Chris Joakim, Microsoft, 2023
 */

import { Request, Response, Router } from 'express';
import { ImageGenerations } from "@azure/openai";
import { OpenAiUtil } from "azu-js";
import { UIHelper } from "./UIHelper";

const router: Router = Router();

const oaiUtil: OpenAiUtil =
  new OpenAiUtil(
    'AZURE_OPENAI_URL',
    'AZURE_OPENAI_KEY1',
    'AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT');

const uri = process.env.AZURE_OPENAI_URL;

router.get("/", async (req: Request, res: Response) => {
  UIHelper.ensureSession(req);

  res.render('openai', {
    uri: uri,
    text: 'A watercolor painting of the planet saturn, primarily light blue with yellow stars',
    error_message: '',
    embeddings_div_visibility: 'hidden',
    image_div_visibility: 'hidden',
    image_url: '',
    tokens: '',
    results: ''
  });
})

router.post("/", async (req: Request, res: Response) => {
  UIHelper.ensureSession(req);
  UIHelper.logBody(req);
  let text = req.body.text;
  let generateImage = false;
  let error_message = '';
  let results = '';
  let tokens = '';
  let embeddings_div_visibility = 'hidden';  // 'visible' or 'hidden'
  let image_div_visibility = 'hidden';
  let image_url = '';

  if (req.body.genImageCheckbox) {
    if (req.body.genImageCheckbox === 'yes') {
      generateImage = true;
    }
  }

  if (!text) {
    error_message = 'Invalid input; no text provided';
  }
  else {
    try {
      if (generateImage) {
        if (text.trim().toLowerCase() === 'demo') {
          // special hard-coded case for demo purposes
          image_url = 'images/dalle-generated-saturn.png'
          image_div_visibility = 'visible';
        }
        else {
          let response: ImageGenerations = await oaiUtil.generateDalleImage(text);
          if (response) {
            image_url = response.data[0]['url'];
            image_div_visibility = 'visible';
            console.log('image_url: ' + image_url);
          }
        }
      }
      else {
        let e = await oaiUtil.generateEmbeddings([text]);
        console.log(e);
        let embeddingsArray = e.data[0]['embedding'];
        tokens = '' + e.usage['totalTokens'];
        results = JSON.stringify(embeddingsArray, null, 2);
        embeddings_div_visibility = 'visible';
      }
    }
    catch (error) {
      console.log(error);
      error_message = 'Error processing this request';
    }
  }

  UIHelper.ensureSession(req);
  res.render('openai', {
    uri: uri,
    text: text,
    error_message: error_message,
    embeddings_div_visibility: embeddings_div_visibility,
    image_div_visibility: image_div_visibility,
    image_url: image_url,
    tokens: tokens,
    results: results
  });
})

export const OpenAiRouter: Router = router;
