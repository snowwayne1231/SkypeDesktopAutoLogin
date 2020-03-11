"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const MsgBodyTransform_1 = require("./MsgBodyTransform");
const DOC_HEAD = `<!DOCTYPE html>
<html>
    <head>
        <title>Archived conversations</title>
        <meta charset="utf-8">
        <link rel="stylesheet" href="style.css">
    </head>
    <body>
        <script>
            document.addEventListener("DOMContentLoaded", function(event) {
                function selectConversation(element) {
                    if (selectedConvLi) {
                        selectedConvLi.className = "conversations";
                    }
                    var href = element.getAttribute('href');
                    selectedConversationHeader.innerHTML = element.innerHTML;
                    selectedConversationDiv.innerHTML='<object class="object" type="text/html" data="' + href + '" ></object>';
                    selectedConvLi = element.parentNode;
                    selectedConvLi.className = "conversations-sel"
                }
                function convCallback(event) {
                    if (event.target.tagName !== 'A') {
                        return;
                    }
                    selectConversation(event.target);
                    event.preventDefault();
                }

                var selectedConvLi = null;
                var selectedConversationDiv = document.getElementById("selected-conversation-placeholder");
                var selectedConversationHeader = document.getElementById("selected-conversation-header");
                var conversations = document.getElementById('conversations');
                conversations.addEventListener('click', convCallback, false);
                selectConversation(conversations.firstElementChild.firstElementChild);
            });
        </script>
        <div class="left">
            <div class="header">
                <h1 class="conversations">Archived conversations</h1>
\n`;
class HtmlIndex {
    constructor(outPath) {
        this._conversations = [];
        this._stream = fs.createWriteStream(path.join(outPath, 'index.html'));
        this._stream.write(DOC_HEAD);
    }
    addEntry(conversation) {
        this._conversations.push(conversation);
    }
    close(accountInfo) {
        this._writeHeader(accountInfo);
        const sorted = this._conversations.sort((a, b) => {
            return b.maxTimestamp && a.maxTimestamp ? b.maxTimestamp - a.maxTimestamp : 1;
        });
        sorted.forEach(conv => { this._writeOne(conv); });
        this._stream.end(`
        </ul>
        </div>
        <div id="selected-conversation" class="right" >
            <h1 class="conversation" id="selected-conversation-header"></h1>
            <div id="selected-conversation-placeholder">
            </div>
        </div>
    </body>
</html>`);
    }
    _writeHeader(accountInfo) {
        const time = this._formatTimestamp(new Date());
        const fullName = MsgBodyTransform_1.sanitizeXml(accountInfo.fullName, '');
        let header = `<table>
                <tbody>
                    <tr><th>User</th><td id="hdr-user">${fullName} <small>(${accountInfo.skypeName})</small></td></tr>
                    <tr><th>Exported</th><td id="hdr-exported">${time}</td></tr>
                    <tr><th>Total</th><td id="hdr-stats">${this._conversations.length} conversations</td></tr>
                </tbody>
            </table>
        </div>
        <ul class="conversations" id="conversations">
        `;
        this._stream.write(header);
    }
    _writeOne(conversation) {
        const timestamp = this._formatTimestamp(new Date(conversation.maxTimestamp ? conversation.maxTimestamp * 1000 : 0));
        const displayName = MsgBodyTransform_1.sanitizeXml(conversation.displayname, '');
        const template = `
        <li class="conversations">
            <a href="${conversation.fileName}#end" target="selected-chat">${displayName}</a>
            <div>
                <span class="messageCount">${conversation.messageCount} ${this._formatMessageCount(conversation.messageCount)}</span>
                <span class="timestamp-conv">Last from: ${timestamp}</span>
            </div>
        </li>\n`;
        this._stream.write(template);
    }
    _formatTimestamp(dt) {
        return `${dt.toLocaleDateString()} ${dt.toLocaleTimeString()}`;
    }
    _formatMessageCount(messageCount) {
        return messageCount !== undefined && messageCount > 1 ? 'messages' : 'message';
    }
}
exports.HtmlIndex = HtmlIndex;
