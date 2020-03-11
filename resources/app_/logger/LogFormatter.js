"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const os = require("os");
const LogLevel_1 = require("./LogLevel");
function getClosingLogMessage() {
    return formatMessage('Skype finished logging.');
}
exports.getClosingLogMessage = getClosingLogMessage;
function getMaxFileSizeReachedMessage(size) {
    return formatMessage(`File size limit reached (${size}B). Rotating log file.`);
}
exports.getMaxFileSizeReachedMessage = getMaxFileSizeReachedMessage;
function getMaxTimeReachedMessage() {
    return formatMessage('Max time after the log creation reached. Rotating log file.');
}
exports.getMaxTimeReachedMessage = getMaxTimeReachedMessage;
function formatMessage(message, level = LogLevel_1.LogLevel.INFO, params) {
    let date = new Date().toUTCString();
    let formattedMessage = `[${date}][${LogLevel_1.LogLevel[level]}]${message} `;
    params = params && params.filter(x => !!x) || [];
    formattedMessage = params.reduce((partialMessage, param) => {
        if (typeof param === 'string' || typeof param === 'undefined') {
            return partialMessage + param + ' ';
        }
        else if (param instanceof Error) {
            return partialMessage + param.toString() + ' ';
        }
        else {
            let objectString = '';
            try {
                objectString = JSON.stringify(param);
            }
            catch (e) {
                objectString = '[Object]';
            }
            return partialMessage + objectString + ' ';
        }
    }, formattedMessage);
    formattedMessage = formattedMessage.trim() + os.EOL;
    return formattedMessage;
}
exports.formatMessage = formatMessage;
