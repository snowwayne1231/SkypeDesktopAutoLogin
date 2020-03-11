"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const ExporterTypes_1 = require("./ExporterTypes");
const FileOutput_1 = require("./FileOutput");
const HtmlIndex_1 = require("./HtmlIndex");
const Logger_1 = require("../../logger/Logger");
const MsgBodyTransform_1 = require("./MsgBodyTransform");
class HtmlFormatter {
    fileExtension() {
        return 'html';
    }
    formatMessage(row) {
        if (!row.body_xml) {
            return undefined;
        }
        const translatedType = ExporterTypes_1.MESSAGE_TYPE_MAP[row.type];
        if (translatedType) {
            let timeString = '';
            if (row.timestamp) {
                timeString = MsgBodyTransform_1.formatTimestamp(row.timestamp);
            }
            let body = '';
            if (row.body_xml) {
                body = MsgBodyTransform_1.sanitizeXml(row.body_xml, row.id);
                if (body === '') {
                    Logger_1.getInstance().debug(`[HtmlFormatter] Empty transformed message, id:${row.id} body: ${row.body_xml}`);
                }
            }
            let fromDisplayName = MsgBodyTransform_1.sanitizeXml(row.from_dispname);
            const result = `<li class="message" id="${row.id}" >
<div>
<span class="author">${fromDisplayName}</span>
<span class="timestamp">${timeString}</span>
</div>
<div class="message-body">${body}</div>
</li>`;
            return result;
        }
        else {
            return undefined;
        }
    }
    formatConversation(row) {
        if (!row || !row.id || !row.identity || !row.type) {
            return undefined;
        }
        const blocked = !!row.is_blocked;
        let str = '';
        if (blocked) {
            str += '<div class="blocked">blocked converation</div>';
        }
        return str;
    }
    fileHeader(row) {
        return `<!DOCTYPE html>
<html>
<head>
<title>${row.displayname}</title>
<meta charset="utf-8" />
<link rel="stylesheet" href="style.css">
</head>
<body class="conversation">
<script>
document.addEventListener("DOMContentLoaded", function(event) {
        var e = document.body;
        e.scrollTop = e.scrollHeight - e.clientHeight;
});
</script>
`;
    }
    fileFooter() {
        return '</body>\n</html>\n';
    }
    messageSeparatorHeader() {
        return '\n<ul class="messages" id ="messages">\n';
    }
    messageSeparatorFooter() {
        return '</ul>\n';
    }
    messageSeparator() {
        return '\n';
    }
    createOutput(completeOutPath, conversation) {
        return new FileOutput_1.FileOutput(this, completeOutPath, conversation);
    }
    init(outPath) {
        let sourcePath = path.join(__dirname, 'resources');
        this._copyFile(sourcePath, outPath, 'style.css');
        this._copyFile(sourcePath, outPath, 'skype.svg');
        this._copyFile(sourcePath, outPath, 'default1.png');
        this._copyFile(sourcePath, outPath, 'default2.png');
        this._index = new HtmlIndex_1.HtmlIndex(outPath);
    }
    getIndex() {
        return this._index;
    }
    _copyFile(sourcePath, outPath, fileName) {
        const rs = fs.createReadStream(path.join(sourcePath, fileName));
        rs.on('error', (err) => Logger_1.getInstance().error(`[HtmlFormatter] Error while trying to copy: ${fileName}: ${err}`));
        const ws = fs.createWriteStream(path.join(outPath, fileName));
        ws.on('error', (err) => Logger_1.getInstance().error(`[HtmlFormatter] Error while trying to copy: ${fileName}: ${err}`));
        rs.pipe(ws);
    }
}
exports.HtmlFormatter = HtmlFormatter;
