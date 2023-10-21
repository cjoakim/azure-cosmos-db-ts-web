/**
 * Express Router for Heartbeat requests.
 * Chris Joakim, Microsoft, 2023
 */

import os from "os";
import { Request, Response, Router } from 'express';

const router: Router = Router();

router.get("/", async (req: Request, res: Response) => {
  let doc = {};
  try {
    doc['os.arch'] = os.arch()
    doc['os.cpu.count'] = os.cpus().length
    doc['os.type'] = os.type()
    doc['os.platform'] = os.platform()
    doc['os.release'] = os.release()
    doc['os.totalmem'] = os.totalmem()
    doc['os.uptime'] = os.uptime()
    doc['os.hostname'] = os.hostname()
    doc['os.homedir'] = os.homedir()
    doc['epoch'] = (new Date().getTime()) / 1000;
  }
  catch (error) {
    console.log('error in get /heartbeat');
  }
  return res.send(doc);
})

export const HeartbeatRouter: Router = router;
