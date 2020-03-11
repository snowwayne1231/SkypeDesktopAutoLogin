"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
function createSession(sessionName, isCached) {
    return electron_1.remote.session.fromPartition(sessionName, { cache: !!isCached });
}
exports.createSession = createSession;
function clearSession(sessionName) {
    const authSession = electron_1.remote.session.fromPartition(sessionName);
    authSession.clearStorageData();
}
exports.clearSession = clearSession;
