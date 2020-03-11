"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
class FileOutput {
    constructor(formatter, outPath, conversation) {
        this._doc = fs.createWriteStream(outPath);
        this.write(formatter.fileHeader(conversation));
        this.write(formatter.formatConversation(conversation));
        this.write(formatter.messageSeparatorHeader());
    }
    write(val) {
        if (val && this._doc) {
            this._doc.write(val);
        }
    }
    close() {
        this._doc.end();
    }
}
exports.FileOutput = FileOutput;
