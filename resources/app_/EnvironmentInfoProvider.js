"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron = require("electron");
const DeviceInfo_1 = require("./DeviceInfo");
class EnvironmentInfoProvider {
    constructor(initializationTimestamp) {
        this.initializationTimestamp = initializationTimestamp;
        this.applicationReloaded = false;
        this.corporateInstallationTag = DeviceInfo_1.deviceInfo.getCorporateInstallationTag();
    }
    setAppReloaded() {
        this.applicationReloaded = true;
        this.initializationTimestamp = Date.now();
    }
}
exports.EnvironmentInfoProvider = EnvironmentInfoProvider;
function getInstance() {
    if (electron.remote) {
        const provider = electron.remote.require(__dirname + '/EnvironmentInfoProvider').environmentInfoProvider;
        if (!provider) {
            throw new Error('EnvironmentInfoProvider not initialized.');
        }
        return provider;
    }
    else {
        if (!exports.environmentInfoProvider) {
            throw new Error('EnvironmentInfoProvider not initialized.');
        }
        return exports.environmentInfoProvider;
    }
}
exports.getInstance = getInstance;
function init(initializationTimestamp) {
    exports.environmentInfoProvider = new EnvironmentInfoProvider(initializationTimestamp);
}
exports.init = init;
