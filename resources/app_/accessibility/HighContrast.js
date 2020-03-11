"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron = require("electron");
const events_1 = require("events");
const Platform_1 = require("../tools/Platform");
exports.IsSystemHighContrastEnabled = 'get-is-high-contrast-enabled';
class HighContrast extends events_1.EventEmitter {
    constructor(logger) {
        super();
        this._logger = logger;
        this._handleChange();
        electron.ipcMain.addListener(exports.IsSystemHighContrastEnabled, (event) => {
            event.returnValue = this._isEnabled();
        });
    }
    _isEnabled() {
        return Platform_1.isWindows() && electron.systemPreferences.isInvertedColorScheme();
    }
    _handleChange() {
        if (!Platform_1.isWindows()) {
            return;
        }
        electron.systemPreferences.on('inverted-color-scheme-changed', (event, inverted) => {
            this._logger.info(`[HighContrast] Inverted color scheme changed: ${inverted}`);
            this.emit('high-contrast-changed', inverted);
        });
    }
}
exports.HighContrast = HighContrast;
function getInstance() {
    if (electron.remote) {
        return electron.remote.require(__dirname + '/HighContrast').highContrastHandler;
    }
    else {
        return exports.highContrastHandler;
    }
}
exports.getInstance = getInstance;
function init(logger) {
    exports.highContrastHandler = new HighContrast(logger);
}
exports.init = init;
