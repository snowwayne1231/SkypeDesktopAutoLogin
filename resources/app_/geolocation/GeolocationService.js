"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron = require("electron");
class GeolocationService {
    constructor(logger) {
        this._logger = logger;
    }
    getCurrentPosition() {
        this._logger.info(`[LocationService] Getting location.`);
        try {
            return this._getLocationModule().getCurrentLocation();
        }
        catch (error) {
            this._logger.error('[LocationService] Getting location failed. Error: ', error);
            return Promise.reject(error);
        }
    }
    _getLocationModule() {
        if (!this._locationModule) {
            this._locationModule = require('skype-location');
        }
        return this._locationModule;
    }
}
exports.GeolocationService = GeolocationService;
let instance;
function getInstance() {
    if (electron.remote) {
        return electron.remote.require(__dirname + '/GeolocationService').getInstance();
    }
    return instance;
}
exports.getInstance = getInstance;
function init(logger) {
    instance = new GeolocationService(logger);
}
exports.init = init;
