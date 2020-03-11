"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3");
const Logger_1 = require("../../logger/Logger");
const CONVERSATION_QUERY = 'select * from Conversations where exists (select convo_id from Messages where Conversations.id = Messages.convo_id)';
const CONVERSATION_COUNT_QUERY = 'select count(*) as total from Conversations where exists (select convo_id from Messages where Conversations.id = Messages.convo_id)';
const MESSAGE_QUERY_PARAM = 'select id, type, chatname, from_dispname, body_xml, timestamp from Messages where convo_id = $convoId order by timestamp asc';
const ACCOUNT_QUERY = 'select skypename, fullname from accounts';
class DbExporter {
    constructor(dbFilePath) {
        this._conversationCount = -1;
        if (!dbFilePath) {
            throw new Error('dbFilePath must be provided');
        }
        if (!fs.existsSync(dbFilePath)) {
            throw new Error(`Database file not found: ${dbFilePath}`);
        }
        sqlite3.verbose();
        this._folderName = path.basename(path.dirname(dbFilePath));
        this._db = new sqlite3.Database(dbFilePath);
        this._extractAccount();
    }
    done() {
        return new Promise((resolve, reject) => {
            if (this._db) {
                this._db.close(err => {
                    this._db = undefined;
                    if (err) {
                        resolve(false);
                    }
                    else {
                        resolve(true);
                    }
                });
            }
            else {
                resolve(true);
            }
        });
    }
    getAccountInfo() {
        return this._accountInfo;
    }
    getConversationCount() {
        return new Promise((resolve, reject) => {
            if (this._conversationCount > -1) {
                resolve(this._conversationCount);
            }
            else {
                this._runQuery(CONVERSATION_COUNT_QUERY, {}, (row) => {
                    this._conversationCount = row.total;
                    resolve(this._conversationCount);
                }, () => {
                });
            }
        });
    }
    eachConversation(convProcessor, runAtEnd) {
        if (!convProcessor) {
            throw new Error('convProcessor must be provided');
        }
        return this._runQuery(CONVERSATION_QUERY, {}, (row) => convProcessor(row), runAtEnd);
    }
    eachMessage(conversationId, msgProcessor, runAtEnd) {
        if (!msgProcessor) {
            throw new Error('msgProcessor must be provided');
        }
        return this._runQuery(MESSAGE_QUERY_PARAM, { $convoId: conversationId }, (row) => msgProcessor(row), runAtEnd);
    }
    _extractAccount() {
        this._runQuery(ACCOUNT_QUERY, {}, (row) => {
            let skypeName = row.skypename || this._folderName;
            let fullName = row.fullname || this._folderName;
            this._accountInfo = { fullName: fullName, skypeName: skypeName };
        }, () => {
        });
    }
    _runQuery(query, params, processor, runAtEnd) {
        if (!query) {
            throw new Error('query must not be null');
        }
        if (!processor) {
            throw new Error('formatter must not be null');
        }
        if (!this._db) {
            throw new Error('Database not initialized');
        }
        this._db.serialize(() => {
            if (!this._db) {
                throw new Error('Database not initialized');
            }
            this._db.each(query, params, (err, row) => {
                if (err) {
                    Logger_1.getInstance().error('[DbExporter] Error while executing statement: ' + err.message);
                }
                else {
                    processor(row);
                }
            }, (err) => {
                if (err) {
                    throw new Error('Error while executing statement: ' + err.message);
                }
                runAtEnd();
            });
        });
    }
}
exports.DbExporter = DbExporter;
