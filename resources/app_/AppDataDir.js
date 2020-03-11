"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = require("path");
const APP_DATA_KEY = 'appData';
const USER_DATA_KEY = 'userData';
function setAppDataPath(relativePath) {
    const appDataPath = electron_1.app.getPath(APP_DATA_KEY);
    const newAppDataPath = path.join(appDataPath, relativePath);
    electron_1.app.setPath(USER_DATA_KEY, newAppDataPath);
}
exports.setAppDataPath = setAppDataPath;
