"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron = require("electron");
class ClipboardManager {
    writeImageFromDataUrl(dataUrl) {
        const image = electron.nativeImage.createFromDataURL(dataUrl);
        electron.clipboard.writeImage(image);
    }
}
exports.ClipboardManager = ClipboardManager;
function getInstance() {
    if (electron.remote) {
        return electron.remote.require(__dirname + '/ClipboardManager').clipboardManager;
    }
    else {
        return exports.clipboardManager;
    }
}
exports.getInstance = getInstance;
function init() {
    exports.clipboardManager = new ClipboardManager();
}
exports.init = init;
