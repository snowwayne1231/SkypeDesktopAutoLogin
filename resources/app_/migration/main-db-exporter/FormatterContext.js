"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
class FormatterContext {
    constructor(formatter, outFolder, conversation) {
        this.anyMessage = false;
        this.isFirst = true;
        this.formatter = formatter;
        const title = (conversation.displayname) ? conversation.displayname.replace(/[\W]/g, '-') : 'export';
        this.outFileName = `${title}-${conversation.id}.${formatter.fileExtension()}`;
        this.completeOutPath = path.join(outFolder, this.outFileName);
        this.conversation = conversation;
        this.index = formatter.getIndex();
    }
    conversationDone() {
        if (this.anyMessage && this.output) {
            this.output.write(this.formatter.messageSeparatorFooter());
            this.output.write(this.formatter.fileFooter());
        }
        if (this.index && this.anyMessage) {
            this.conversation.fileName = this.outFileName;
            this.index.addEntry(this.conversation);
        }
        if (this.output) {
            this.output.close();
        }
    }
    lastConversationDone(accountInfo) {
        if (this.index) {
            this.index.close(accountInfo);
        }
    }
}
exports.FormatterContext = FormatterContext;
