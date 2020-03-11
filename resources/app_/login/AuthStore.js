"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron = require("electron");
class AuthStore {
    setUsername(username) {
        this._username = username;
    }
    getUsername() {
        return this._username;
    }
    isAuthenticated() {
        return !!this._username;
    }
    setIsGuestUser(isGuestUser) {
        this._isGuestUser = isGuestUser;
    }
    isGuestUser() {
        return !!this._isGuestUser;
    }
}
exports.AuthStore = AuthStore;
let instance;
function getInstance() {
    if (electron.remote) {
        return electron.remote.require(__dirname + '/AuthStore').getInstance();
    }
    return instance;
}
exports.getInstance = getInstance;
function init() {
    instance = new AuthStore();
}
exports.init = init;
