"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron = require("electron");
const Configuration_1 = require("./configuration/Configuration");
const Platform_1 = require("./tools/Platform");
const PackageInfo_1 = require("./configuration/PackageInfo");
class ClientVersion {
    constructor() {
        this._cobrand = '0';
        if (Configuration_1.default.isMsix) {
            this._platform = '1434';
        }
        else {
            this._platform = Platform_1.pickByPlatform('1433', '1432', '1431');
        }
        const packageData = PackageInfo_1.readPackageJson().getData();
        this._clientVersionShort = packageData.appVersion;
        this._buildVersion = packageData.appBuild;
        this._cobrand = packageData.cobrand;
    }
    getPlatform() {
        return this._platform;
    }
    getCobrand() {
        return this._cobrand;
    }
    getVersion() {
        return this._clientVersionShort + '.' + this._cobrand + '.' + this._buildVersion;
    }
    getFullVersion() {
        return this._platform + '/' + this.getVersion() + '/';
    }
}
exports.ClientVersion = ClientVersion;
let instance;
function init() {
    instance = new ClientVersion();
}
exports.init = init;
function getInstance() {
    if (electron.remote) {
        return electron.remote.require(__dirname + '/ClientVersion').getInstance();
    }
    else {
        return instance;
    }
}
exports.getInstance = getInstance;
