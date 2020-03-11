"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const DOC_HEAD = `<!DOCTYPE html>
<html>
    <head>
        <title>Archived conversations</title>
        <meta charset="utf-8">
    </head>
<body>
    <div class="header">
        <h1 class="conversations">Archived conversations</h1>
        <ul class="exported-accounts" id="accounts">
\n`;
class BatchIndex {
    constructor(outPath) {
        this._exportedItems = [];
        this._outPath = outPath;
    }
    addEntry(account, indexPath) {
        this._exportedItems.push({
            account,
            indexPath: path.join(indexPath, 'index.html')
        });
    }
    write() {
        if (!this._exportedItems.length) {
            return;
        }
        this._stream = fs.createWriteStream(path.join(this._outPath, 'index.html'));
        this._stream.write(DOC_HEAD);
        this._exportedItems.forEach(exportItem => {
            this._writeOne(exportItem);
        });
        this._stream.end(`
        </ul>
    </body>
</html>`);
    }
    _writeOne(exportItem) {
        let relativePath = exportItem.indexPath.startsWith(this._outPath)
            ? exportItem.indexPath.replace(this._outPath, '.')
            : exportItem.indexPath;
        relativePath = relativePath.replace('#', '%23');
        const template = `<li class="account">
        <a href="${relativePath}">${exportItem.account.fullName} (${exportItem.account.skypeName})</a>
        </li>\n`;
        this._stream.write(template);
    }
}
exports.BatchIndex = BatchIndex;
