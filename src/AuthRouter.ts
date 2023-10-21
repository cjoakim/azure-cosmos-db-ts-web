/**
 * Authorization Router for the app - handles logon, logoff.
 * Chris Joakim, Microsoft, 2023
 */

import { Request, Response, Router } from 'express';
import { UIHelper } from "./UIHelper";

const router: Router = Router();

router.get("/logon", async (req: Request, res: Response) => {
  req.session = {};
  UIHelper.logSession(req);
  res.render('logon', {
    message: ''
  });
})

router.post("/logon", async (req: Request, res: Response) => {
  UIHelper.logSession(req);
  UIHelper.logBody(req);
  let user_id = req.body.user_id;
  let password = req.body.password;

  try {
    if (isAuthenticatedUser(user_id, password)) {
      UIHelper.ensureSession(req);
      req.session.user_id = user_id;
      UIHelper.logSession(req);
      res.redirect('/about');
      return;
    }
  }
  catch (error) {
    console.log('error in post /logon');
  }
  UIHelper.clearSession(req);
  res.render('logon', {
    message: 'Invalid user_id & password combination'
  });
})

router.get("/logoff", async (req: Request, res: Response) => {
  UIHelper.clearSession(req);
  res.render('logon', {
    message: ''
  });
})

router.post("/logoff", async (req: Request, res: Response) => {
  UIHelper.clearSession(req);
  res.render('logon', {
    message: ''
  });
})

/**
 * This authentication mechanism is ONLY for demonstration non-production purposes.
 * For an actual application, please use an Enterprise authentication
 * system such as Microsoft Entra ID (i.e. - Azure Active Directory ).
 * See https://learn.microsoft.com/en-us/azure/active-directory/fundamentals/new-name
 * See https://learn.microsoft.com/en-us/javascript/api/overview/azure/active-directory
 */
function isAuthenticatedUser(user_id: string, password: string): boolean {
  console.log('isAuthenticatedUser: ' + user_id + ' ' + password);

  try {
    if (user_id) {
      if (password) {
        let definedUsers = getAuthPairs();
        console.log('definedUsers: ' + JSON.stringify(definedUsers));
        for (const defIdPw of definedUsers) {
          if (user_id == defIdPw[0]) {
            if (password == defIdPw[1]) {
              return true;
            }
          }
        }
      }
    }
  }
  catch (error) {
    console.log('error in isAuthenticatedUser');
  }
  return false;
}

function getAuthPairs(): Array<object> {
  let pairs = [];
  try {
    let rawPairs = ('' + process.env.AZURE_WEB_AUTH_USERS).split('~~');
    for (const userDef of rawPairs) {
      let userIdPw = userDef.split('~');
      if (userIdPw.length == 2) {
        pairs.push(userIdPw);
      } 
    }
  }
  catch (error) {
    console.log(error);
  }
  console.log('getAuthPairs: ' + JSON.stringify(pairs));
  return pairs;
}

export const AuthRouter: Router = router;
