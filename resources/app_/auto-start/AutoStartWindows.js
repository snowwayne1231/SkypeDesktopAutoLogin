"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const Registry = require("winreg");
const AutoStartBase_1 = require("./AutoStartBase");
const Logger_1 = require("../logger/Logger");
class AutoStartWindows extends AutoStartBase_1.AutoStartBase {
    constructor() {
        super();
        this._name = 'Skype for Desktop';
        this._registry = new Registry({
            hive: Registry.HKCU,
            key: '\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'
        });
    }
    _enable(isEnabled) {
        if (isEnabled) {
            const exePath = electron_1.app.getPath('exe');
            try {
                this._registry.set(this._name, Registry.REG_SZ, exePath, err => {
                    if (err) {
                        Logger_1.getInstance().error(`[AutoStartWindows] Error setting ${this._registryLog} to ${exePath}`, err);
                    }
                    else {
                        Logger_1.getInstance().info(`[AutoStartWindows] Set ${this._registryLog} to ${exePath}`, err);
                    }
                });
            }
            catch (ignore) {
                Logger_1.getInstance().info('[AutoStartWindows] Error while reading registry key registry.set()');
            }
        }
        else {
            try {
                this._registry.remove(this._name, err => {
                    if (err) {
                        Logger_1.getInstance().error(`[AutoStartWindows] Error removing ${this._registryLog}`, err);
                    }
                    else {
                        Logger_1.getInstance().info(`[AutoStartWindows] Removed ${this._registryLog}`);
                    }
                });
            }
            catch (ignore) {
                Logger_1.getInstance().info('[AutoStartWindows] Error while reading registry key registry.remove()');
            }
        }
    }
    get _registryLog() {
        return `registry key ${this._registry.key} and name ${this._name}`;
    }
}
exports.AutoStartWindows = AutoStartWindows;
