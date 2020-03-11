"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const msFromStart = Math.floor(process.uptime() * 1000);
const _initializationTimestamp = Date.now() - msFromStart;
const electron_1 = require("electron");
const path = require("path");
process.chdir(path.dirname(electron_1.app.getPath('exe')));
electron_1.app.commandLine.appendSwitch('--ms-disable-indexeddb-transaction-timeout');
electron_1.app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
const Configuration_1 = require("./configuration/Configuration");
const AppDataDir_1 = require("./AppDataDir");
AppDataDir_1.setAppDataPath(Configuration_1.default.appDataDir);
const ApplicationFactory_1 = require("./ApplicationFactory");
const CrashReporting_1 = require("./CrashReporting");
const DeviceInfo_1 = require("./DeviceInfo");
const MainIpcEventHandlers_1 = require("./MainIpcEventHandlers");
DeviceInfo_1.deviceInfo.init();
CrashReporting_1.initializeCrashReporter();
let application;
try {
    application = ApplicationFactory_1.init(Configuration_1.default, _initializationTimestamp);
}
catch (e) {
    console.log('Problem initializing the app', e);
}
if (application) {
    electron_1.app.on('ready', () => {
        application.start();
        MainIpcEventHandlers_1.default();
    });
}
