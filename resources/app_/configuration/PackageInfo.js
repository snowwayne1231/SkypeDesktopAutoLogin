"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron = require("electron");
const fs = require("fs");
const path = require("path");
class PackageInfo {
    constructor(packageJsonDir) {
        let packageJsonPath = path.join(packageJsonDir, 'package.json');
        this._info = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    }
    getData() {
        if (!this._info) {
            throw new Error('Package info not initialized.');
        }
        return this._info;
    }
}
exports.PackageInfo = PackageInfo;
function readPackageJson() {
    let path = electron.remote ? electron.remote.app.getAppPath() : electron.app.getAppPath();
    return new PackageInfo(path);
}
exports.readPackageJson = readPackageJson;
