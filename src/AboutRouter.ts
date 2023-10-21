/**
 * Express Router for the About view.
 * Chris Joakim, Microsoft, 2023
 */

import { Request, Response, Router } from 'express';

const router: Router = Router();

router.get("/", async (req: Request, res: Response) => {
  res.render('about', { title: 'About' });
})

export const AboutRouter: Router = router;
