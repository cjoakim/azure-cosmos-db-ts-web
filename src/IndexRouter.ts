/**
 * Express Router for the Index (i.e. - home) page.
 * Chris Joakim, Microsoft, 2023
 */

import { Request, Response, Router } from 'express';

const router: Router = Router();

router.get("/", async (req: Request, res: Response) => {
  res.redirect('/about');
})

router.get("/index", async (req: Request, res: Response) => {
  res.render('index', { title: 'expresso index' });
})

router.get("/layout", async (req: Request, res: Response) => {
  res.render('index', { title: 'expresso layout' });
})

export const IndexRouter: Router = router;
