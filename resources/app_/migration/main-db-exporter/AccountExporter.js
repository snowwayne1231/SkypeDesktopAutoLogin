"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3");
const Logger_1 = require("../../logger/Logger");
const CONVERSATION_COUNT_QUERY = 'select count(*) as total from Conversations where exists (select convo_id from Messages where Conversations.id = Messages.convo_id)';
const ACCOUNT_QUERY = 'select skypename, fullname from accounts';
class AccountExporter {
    constructor(dbFilePaths) {
        this._accountInfo = [];
        if (!dbFilePaths) {
            throw new Error('dbFilePath must be provided');
        }
        this._logger = Logger_1.getInstance();
        this._dbPaths = dbFilePaths;
    }
    getAccountDetails() {
        return __awaiter(this, void 0, void 0, function* () {
            this._accountInfo = [];
            for (let dbPath of this._dbPaths) {
                try {
                    let info = yield this._processDatabase(dbPath);
                    this._accountInfo.push(info);
                }
                catch (err) {
                    this._logger.error(`[AccountExporter] Error fetching account info for ${dbPath}: ${err.message}`);
                }
            }
            return this._accountInfo.sort((a, b) => {
                return b.conversationCount && a.conversationCount ? b.conversationCount - a.conversationCount : 1;
            });
        });
    }
    _processDatabase(dbPath) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!fs.existsSync(dbPath)) {
                throw new Error(`Path doesn't exist: ${dbPath}`);
            }
            let fallbackUsername = path.basename(path.dirname(dbPath)).replace('#3a', ':');
            let db = new sqlite3.Database(dbPath);
            try {
                let account = yield this._getUser(db, fallbackUsername);
                account.dbPath = dbPath;
                account.conversationCount = yield this._getConvCount(db);
                yield this._close(db);
                db = undefined;
                return account;
            }
            catch (err) {
                yield this._close(db);
                db = undefined;
                throw err;
            }
        });
    }
    _getUser(db, fallbackName) {
        return new Promise((resolve, reject) => {
            let skypeName = fallbackName;
            let fullName = fallbackName;
            db.serialize(() => {
                db.each(ACCOUNT_QUERY, {}, (err, row) => {
                    if (err) {
                        this._logger.error('[AccountExporter] Error while executing statement: ' + err.message);
                    }
                    else {
                        skypeName = row.skypename || fallbackName;
                        fullName = row.fullname || fallbackName;
                    }
                }, (err) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve({
                            skypeName,
                            fullName
                        });
                    }
                });
            });
        });
    }
    _getConvCount(db) {
        return new Promise((resolve, reject) => {
            let count;
            db.serialize(() => {
                db.each(CONVERSATION_COUNT_QUERY, {}, (err, row) => {
                    if (err) {
                        this._logger.error('[AccountExporter] Error while executing statement: ' + err.message);
                    }
                    else {
                        count = row.total || 0;
                    }
                }, (err) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(count);
                    }
                });
            });
        });
    }
    _close(db) {
        return new Promise((resolve, reject) => {
            db.close(err => {
                if (err) {
                    resolve(false);
                }
                else {
                    resolve(true);
                }
            });
        });
    }
}
exports.AccountExporter = AccountExporter;
