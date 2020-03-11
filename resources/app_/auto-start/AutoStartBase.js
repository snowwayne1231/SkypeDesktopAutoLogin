"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AppSettings_1 = require("../AppSettings");
class AutoStartBase {
    sync() {
        const isEnabled = !!AppSettings_1.appSettings.get().autoStartEnabled;
        if (this._isEnabled === undefined || this._isEnabled !== isEnabled) {
            this._enable(isEnabled);
        }
        this._isEnabled = isEnabled;
        AppSettings_1.appSettings.once('app-settings-changed', () => {
            this.sync();
        });
    }
}
exports.AutoStartBase = AutoStartBase;
