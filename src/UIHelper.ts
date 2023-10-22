/**
 * Class UIHelper contains helper methods used by both the
 * Routers and the entry-point of the application.
 * Chris Joakim, Microsoft, 2023
 */

import { Request } from 'express';
import { FileUtil } from "azu-js";
import { v4 as uuidv4 } from 'uuid';

const UPLOADS_DIR = 'uploads/';
const TMP_DIR = 'tmp/';

const fu: FileUtil = new FileUtil();

export class UIHelper {

    private static definedSessionKeys = [
        'session_id',
        'user_id',
        'db_container',
        'dbname',
        'cname',
        'sql',
        'index_name',
        'cog_search',
        'cog_search_index'
    ];

    constructor() { }

    static appName(): string {
        return 'azure-cosmos-db-ts-web';
    }

    /**
     * Ensure that the HTTP session has the expected attributes populated
     * so that the EJS views can be rendered without errors.
     */
    static ensureSession(req: Request, log = false): void {
        try {
            for (var i = 0; i < this.definedSessionKeys.length; i++) {
                let key = this.definedSessionKeys[i];
                switch (key) {
                    case "session_id":
                        req.session[key] = (req.session[key] || uuidv4());
                        break;
                    case "user_id":
                        // retain the current value, if any
                        break;
                    case "sql":
                        req.session[key] = (req.session[key] || UIHelper.sampleCosmosDbNoSqlQuery());
                        break;
                    case "cog_search":
                        req.session[key] = (req.session[key] || UIHelper.sampleCognitiveSearchQuery());
                        break;
                    case "cog_search_index":
                        req.session[key] = (req.session[key] || 'baseballplayers');
                        break;
                    default:
                        req.session[key] = (req.session[key] || '');
                }
            }
        }
        catch (error) {
            console.log('error in ensureSession');
        }
        if (log) {
            this.logSession(req);
        }
        return;
    }

    static clearSession(req: Request, log = false): void {
        try {
            for (var i = 0; i < this.definedSessionKeys.length; i++) {
                let key = this.definedSessionKeys[i];
                req.session[key] = '';

            }
            if (log) {
                this.logSession(req);
            }
        }
        catch (error) {
            console.log('error in clearSession');
        }
        return;
    }

    static sessionId(req: Request): string {
        return req.session['session_id'];
    }

    static sessionUserId(req: Request): string {
        return req.session['user_id'];
    }

    static logSession(req: Request): void {
        try {
            console.log(JSON.stringify(req.session, null, 2));
        }
        catch (error) {
            console.log('error in logSession');
        }
    }

    static logBody(req: Request): void {
        try {
            if (req.body) {
                console.log(JSON.stringify(req.body, null, 2));
            }
        }
        catch (error) {
            console.log('error in logBody');
        }
    }

    static parseJson(text: string): object {
        if (!text) {
            return null;
        }
        try {
            return JSON.parse(text);
        }
        catch (error) {
            console.log('unable to parseJson');
            return null;
        }
    }

    static port(): number {
        if (process.env.PORT) {
            try {
                return parseInt(process.env.PORT);
            }
            catch (error) {
                console.log('unable to parse PORT');
            }
        }
        return 3000;
    }

    static cookieName(): string {
        return this.appName();
    }

    static cookieAge(): number {
        let default_value: number = 7 * 24 * 60 * 60 * 1000;
        if (process.env.AZURE_WEB_COOKIE_AGE) {
            try {
                return parseInt(process.env.AZURE_WEB_COOKIE_AGE);
            }
            catch (error) {
                console.log('unable to parse AZURE_WEB_COOKIE_AGE; will use default value');
            }
        }
        return default_value;
    }

    static cookieKeys(): Array<string> {
        let default_value = ['irxGDlQhibAHg.7b', 'YOI-5i3PJtMJb6AK'];
        if (process.env.AZURE_WEB_COOKIE_KEYS) {
            try {
                let keys = process.env.AZURE_WEB_COOKIE_KEYS.split('|');
                if (keys.length != 2) {
                    return keys;
                }
                else {
                    console.log('two AZURE_WEB_COOKIE_KEYS values were expected; will use defaults')
                }
            }
            catch (error) {
                console.log('unable to parse AZURE_WEB_COOKIE_KEYS; will use defaults');
            }
        }
        return default_value
    }

    static fileUtil(): FileUtil {
        return fu;
    }

    static tmpDir(): string {
        return TMP_DIR;
    }

    static uploadsDir(): string {
        return UPLOADS_DIR;
    }

    static deleteTmpFiles(): void {
        return this.deleteFilesInDir(TMP_DIR);
    }

    static deleteUploadFiles(): void {
        return this.deleteFilesInDir(UPLOADS_DIR);
    }

    static sampleCosmosDbNoSqlDocument(): object { 
        let doc = {};
        doc['id']   = uuidv4();
        doc['pk']   = '123456';
        doc['band'] = 'U2';
        doc['tour'] = 'UV';
        doc['song'] = 'Ultraviolet';
        doc['duration'] = 331;
        doc['band_members'] = ['Bono', 'Edge', 'Adam', 'Larry'];
        doc['date'] = new Date().toISOString();
        return doc;
    }

    static sampleCosmosDbNoSqlQuery(): string { 
        return 'select * from c offset 0 limit 1';
    }

    static sampleCognitiveSearchQuery(): string {
        return `
{
  "count": "true",
  "search": "playerID eq 'henderi01'",
  "orderby": "playerID",
  "select": "id,playerID,nameFirst,nameLast,primary_position,embeddings_str"
}`.trim();
    }

    private static deleteFilesInDir(dir: string): void {
        try {
            fu.listFilesInDir(dir).forEach((file) => {
                console.log('deleteFilesInDir dir: ' + dir + ' file: ' + file);
            });
            return fu.deleteFilesInDir(dir);
        }
        catch (error) {
            console.log('error in deleteFilesInDir: ' + error);
        }
    }

    private static trycatch(): void {
        try {

        }
        catch (error) {
            console.log('error in xxx');
        }
    }
}
