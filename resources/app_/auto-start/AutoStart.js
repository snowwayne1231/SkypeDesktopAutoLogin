"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const AutoStartLinux_1 = require("./AutoStartLinux");
const AutoStartWindows_1 = require("./AutoStartWindows");
const Configuration_1 = require("../configuration/Configuration");
const Platform_1 = require("../tools/Platform");
const buildAutoStart = function () {
    if (!Configuration_1.default.autoStartSupported) {
        return undefined;
    }
    if (Platform_1.isLinux()) {
        return new AutoStartLinux_1.AutoStartLinux();
    }
    if (Platform_1.isWindows()) {
        return new AutoStartWindows_1.AutoStartWindows();
    }
    return undefined;
};
if (electron_1.remote) {
    exports.autoStart = electron_1.remote.require(__dirname + '/AutoStart').autoStart;
}
else {
    exports.autoStart = buildAutoStart();
}
