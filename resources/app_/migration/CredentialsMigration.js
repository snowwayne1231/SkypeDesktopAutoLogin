"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron = require("electron");
const fs = require("fs");
const path = require("path");
const Platform_1 = require("../tools/Platform");
const app = (electron.app || electron.remote.app);
const slimcoreLogPath = path.join(app.getPath('userData'), 'skylib');
const oldSkypeData = path.join(app.getPath('appData'), Platform_1.isLinux() ? '.Skype' : 'Skype');
const sharedName = 'shared.xml';
const configName = 'config.xml';
function getConfigs(basePath) {
    try {
        return fs.readdirSync(basePath).filter(file => fs.lstatSync(path.join(basePath, file)).isDirectory() && fs.existsSync(path.join(basePath, file, configName)));
    }
    catch (e) {
        return [];
    }
}
function copyFile(source, dest) {
    try {
        fs.writeFileSync(dest, fs.readFileSync(source));
    }
    catch (e) {
        return false;
    }
    return true;
}
function mkDir(path) {
    try {
        fs.mkdirSync(path);
    }
    catch (e) {
        return false;
    }
    return true;
}
function copyOldCredentials() {
    if (fs.existsSync(slimcoreLogPath) || !fs.existsSync(oldSkypeData) || !fs.existsSync(path.join(oldSkypeData, sharedName))) {
        return false;
    }
    const configs = getConfigs(oldSkypeData);
    if (!configs.length) {
        return false;
    }
    if (mkDir(slimcoreLogPath) && copyFile(path.join(oldSkypeData, sharedName), path.join(slimcoreLogPath, sharedName))) {
        configs.forEach(config => {
            if (mkDir(path.join(slimcoreLogPath, config))) {
                copyFile(path.join(oldSkypeData, config, configName), path.join(slimcoreLogPath, config, configName));
            }
        });
        return true;
    }
    else {
        return false;
    }
}
exports.copyOldCredentials = copyOldCredentials;
