"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = require("crypto");
const electron = require("electron");
const fs = require("fs");
const path = require("path");
const File_1 = require("./tools/File");
const DEVICEID_LENGTH = 32;
class DeviceInfo {
    constructor(fileName) {
        this._initialized = false;
        this._validIdTest = /^[0-9A-Z-_]+$/i;
        this._execDir = path.dirname(process.execPath);
        this._filePath = path.join(electron.app.getPath('userData'), fileName);
    }
    init() {
        if (this._initialized && this._info) {
            return;
        }
        try {
            let json = fs.readFileSync(this._filePath, 'utf8');
            let info = JSON.parse(json);
            if (info && info.deviceId && this._validIdTest.test(info.deviceId)) {
                this._info = info;
            }
            else {
                this._info = this._createDeviceInfo();
            }
        }
        catch (err) {
            this._info = this._createDeviceInfo();
        }
        this._initialized = true;
    }
    getId() {
        if (!this._initialized) {
            this._initError = '[DeviceInfo] Instance not initialized';
            throw new Error('DeviceInfo instance not initialized. Did you forget to call init?');
        }
        if (!(this._info && this._info.deviceId)) {
            return undefined;
        }
        return this._info.deviceId;
    }
    getErrorMessage() {
        return this._initError;
    }
    getCorporateInstallationTag() {
        const tagFile = path.join(this._execDir, 'service_resources_cid.tag');
        const TagRegEx = /^CID:([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))$/;
        const InvalidServiceTag = 'CID:2019-01-01';
        let tag;
        try {
            tag = fs.readFileSync(tagFile, 'utf8').trim();
            if (!tag.match(TagRegEx)) {
                tag = InvalidServiceTag;
            }
        }
        catch (err) {
            tag = undefined;
        }
        return tag;
    }
    _createDeviceInfo() {
        const deviceId = crypto.randomBytes(DEVICEID_LENGTH / 2).toString('hex');
        let info = { deviceId };
        const infoString = JSON.stringify(info);
        try {
            File_1.ensureDir(path.dirname(this._filePath));
            fs.writeFileSync(this._filePath, infoString);
        }
        catch (err) {
            this._initError = `[DeviceInfo] Failed writing the file. ${err}`;
            info = undefined;
        }
        return info;
    }
}
exports.DeviceInfo = DeviceInfo;
function buildDeviceInfo() {
    if (electron.remote) {
        return electron.remote.require(__dirname + '/DeviceInfo').deviceInfo;
    }
    else {
        return new DeviceInfo('device-info.json');
    }
}
exports.deviceInfo = buildDeviceInfo();
