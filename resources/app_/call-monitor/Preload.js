"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const DomUtils_1 = require("../security/DomUtils");
const PopupWindowApi_1 = require("../popup-window/PopupWindowApi");
const PreloadShared_1 = require("../PreloadShared");
class CallMonitorApiImpl extends PopupWindowApi_1.PopupWindowApiImpl {
    get slimcore() {
        if (!this._slimcore) {
            try {
                this._slimcore = module.require('slimcore');
            }
            catch (e) {
                console.error(`[CallMonitorApi] Failed to load slimcore: ${e}`);
            }
        }
        return this._slimcore;
    }
    get videoRenderer() {
        if (!this._videoRenderer) {
            try {
                this._videoRenderer = module.require('slimcore/lib/video-renderer');
            }
            catch (e) {
                console.error(`[CallMonitorApi] Failed to load video-renderer: ${e}`);
            }
        }
        return this._videoRenderer;
    }
}
window['callMonitorApi'] = new CallMonitorApiImpl();
window['EventEmitter'] = events_1.EventEmitter;
PreloadShared_1.overrideLogger();
DomUtils_1.disableDragAndDrop();
