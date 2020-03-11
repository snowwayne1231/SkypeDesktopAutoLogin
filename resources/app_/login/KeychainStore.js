"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron = require("electron");
class KeychainStore {
    constructor(logger) {
        this._logger = logger;
    }
    getPassword(service, account) {
        this._logger.info(`[KeychainStore] Getting stored credentials from keytar, service: ${service}.`);
        return this._getKeytar().getPassword(service, account).then((result) => {
            if (result) {
                return result;
            }
            else {
                this._logger.info('[KeychainStore] No stored credentials fetched from keytar.');
                return Promise.reject(new Error('No stored credentials fetched from keytar.'));
            }
        }).catch((error) => {
            this._logger.error('[KeychainStore] Getting stored credentials failed. Error: ', error);
            return Promise.reject(error);
        });
    }
    setPassword(service, account, password) {
        this._logger.info(`[KeychainStore] Storing credentials, service: ${service}.`);
        return this._getKeytar().setPassword(service, account, password).then(() => {
            this._logger.info('[KeychainStore] Credentials stored.');
        }).catch((error) => {
            this._logger.error('[KeychainStore] Storing credentials failed. Error: ', error);
            return Promise.reject(error);
        });
    }
    deletePassword(service, account) {
        this._logger.info(`[KeychainStore] Deleting credentials, service: ${service}.`);
        return this._getKeytar().deletePassword(service, account).then((result) => {
            this._logger.info(`[KeychainStore] Deleting stored credentials. Success: ${result}.`);
            return result;
        }).catch((error) => {
            this._logger.error('[KeychainStore] Deleting credentials failed. Error: ', error);
            return Promise.reject(error);
        });
    }
    _getKeytar() {
        if (!this._keytar) {
            this._keytar = require('keytar');
        }
        return this._keytar;
    }
}
exports.KeychainStore = KeychainStore;
let instance;
function getInstance() {
    if (electron.remote) {
        return electron.remote.require(__dirname + '/KeychainStore').getInstance();
    }
    return instance;
}
exports.getInstance = getInstance;
function init(logger) {
    instance = new KeychainStore(logger);
}
exports.init = init;
