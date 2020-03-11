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
const path = require("path");
const BatchIndex_1 = require("./BatchIndex");
const DbExporter_1 = require("./DbExporter");
const fileUtils = require("./FileUtils");
const FormatterContext_1 = require("./FormatterContext");
const HtmlFormatter_1 = require("./HtmlFormatter");
class BatchHtmlExporter {
    constructor(accounts, outputDir) {
        this._lastProgress = -1;
        if (!accounts) {
            throw new Error('accounts must be provided');
        }
        if (!outputDir) {
            throw new Error('outputDir must be provided');
        }
        this._accounts = accounts;
        this._outputDir = outputDir;
        this._accountsCount = this._accounts.length;
        this._progress = new Array(this._accountsCount);
        this._progress.fill(0);
        this._batchindex = new BatchIndex_1.BatchIndex(outputDir);
    }
    onProgress(callback) {
        if (typeof callback === 'function') {
            this._onProgressCallback = callback;
        }
    }
    export() {
        return __awaiter(this, void 0, void 0, function* () {
            yield Promise.all(this._accounts.map((account, index) => __awaiter(this, void 0, void 0, function* () {
                yield this._exportDatabase(account, index);
            })));
            this._batchindex.write();
        });
    }
    _reportTotalProgress(index, progress) {
        if (!this._onProgressCallback) {
            return;
        }
        this._progress[index] = progress;
        let sum = this._progress.reduce((a, b) => a + b, 0);
        let totalProgress = Math.floor(sum / this._accountsCount);
        if (this._lastProgress !== totalProgress) {
            this._lastProgress = totalProgress;
            this._onProgressCallback(this._lastProgress);
        }
    }
    _exportDatabase(account, index) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                try {
                    let accountOutputDirname = account.skypeName.replace(':', '#3a');
                    let accountOutput = path.join(this._outputDir, accountOutputDirname);
                    fileUtils.ensureDir(accountOutput);
                    let dbExporter = new DbExporter_1.DbExporter(account.dbPath);
                    let formatter = new HtmlFormatter_1.HtmlFormatter();
                    formatter.init(accountOutput);
                    let progressCounter = 0;
                    this._reportTotalProgress(index, 0);
                    dbExporter.getConversationCount().then(convCountTotal => {
                        dbExporter.eachConversation((conversation) => {
                            if (!conversation || !conversation.id) {
                                return;
                            }
                            let ctx = new FormatterContext_1.FormatterContext(formatter, accountOutput, conversation);
                            conversation.maxTimestamp = 0;
                            dbExporter.eachMessage(conversation.id, msg => {
                                this._applyFormatter(ctx, msg, conversation);
                            }, () => {
                                ctx.conversationDone();
                                progressCounter++;
                                if (convCountTotal > 0) {
                                    let percent = Math.floor((progressCounter / convCountTotal) * 100);
                                    if (percent > 100) {
                                        percent = 100;
                                    }
                                    this._reportTotalProgress(index, percent);
                                }
                                if (progressCounter === convCountTotal) {
                                    ctx.lastConversationDone(dbExporter.getAccountInfo());
                                    this._batchindex.addEntry(account, accountOutput);
                                    dbExporter.done().then(() => {
                                        resolve();
                                    });
                                }
                            });
                        }, () => {
                        });
                    });
                }
                catch (err) {
                    reject(err);
                }
            });
        });
    }
    _applyFormatter(ctx, msg, conversation) {
        const formattedMsg = ctx.formatter.formatMessage(msg);
        if (formattedMsg) {
            ctx.anyMessage = true;
            if (ctx.isFirst) {
                ctx.isFirst = false;
                ctx.output = ctx.formatter.createOutput(ctx.completeOutPath, conversation);
                conversation.messageCount = 1;
            }
            else {
                ctx.output.write(ctx.formatter.messageSeparator());
                if (conversation.messageCount === undefined) {
                    conversation.messageCount = 0;
                }
                conversation.messageCount += 1;
            }
            ctx.output.write(formattedMsg);
            conversation.maxTimestamp = conversation.maxTimestamp
                ? Math.max(msg.timestamp, conversation.maxTimestamp) : msg.timestamp;
        }
    }
}
exports.BatchHtmlExporter = BatchHtmlExporter;
