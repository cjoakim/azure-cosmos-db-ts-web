/**
 * This is the entry-point for this Express-based web application.
 * Chris Joakim, Microsoft, 2023
 */

import express, { Express, Request, Response, NextFunction } from 'express';

import expressLayouts from "express-ejs-layouts";

import { AuthRouter } from './AuthRouter';
import { AboutRouter } from './AboutRouter';
import { ConfigRouter } from './ConfigRouter';
import { IndexRouter } from './IndexRouter';
import { CosmosRouter } from './CosmosRouter';
import { OpenAiRouter } from './OpenAiRouter';
import { HeartbeatRouter } from './HeartbeatRouter';
import { CogSearchRouter } from './CogSearchRouter';
import { UIHelper } from "./UIHelper";

UIHelper.deleteUploadFiles();

const app: Express = express();
const http = require('http').createServer(app);
const logger = require('morgan');
const path = require('path');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const cookieSession = require('cookie-session');
const port = UIHelper.port();

// View engine setup
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'ejs');

// Middleware
app.use(logger('dev'));
app.use(expressLayouts);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(cookieSession({
    name: UIHelper.cookieName(),
    keys: UIHelper.cookieKeys(),
    maxAge: UIHelper.cookieAge(),
    overwrite: true
}))
app.use(express.static('public'));

function authMiddleware(req: Request, res: Response, next: NextFunction) {
    if ((req.path === '/auth/logon') || (req.path === '/api/heartbeat')) {
        next();
    }
    else {
        if (req.session.user_id) {
            next();
        }
        else {
            UIHelper.clearSession(req);
            console.log('redirecting to /auth/logon ' + req.ip + ' ' + req.headers)
            try {
                console.log('redirecting to /auth/logon; req ip: ' + req.ip);
                console.log('redirecting to /auth/logon; req user-agent: ' + JSON.stringify(req.headers['user-agent']));
            }
            catch (error) {
                // ignore
            }
            res.redirect('/auth/logon');
        }
    }
}
app.use(authMiddleware);

// Routing
app.use('/', IndexRouter);
app.use('/auth', AuthRouter);
app.use('/about', AboutRouter);
app.use('/config', ConfigRouter);
app.use('/cosmos', CosmosRouter);
app.use('/openai', OpenAiRouter);
app.use('/cogsearch', CogSearchRouter);
app.use('/api/heartbeat', HeartbeatRouter);

app.get('/ping', (req, res) => {
    res.send("ping @ " + new Date().toISOString());
})

http.listen(port, () => console.log(`[server]: Express App is listening on port ${port}`));
