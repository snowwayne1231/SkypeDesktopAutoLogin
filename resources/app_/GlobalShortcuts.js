"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron = require("electron");
class GlobalShortcutsImpl {
    constructor() {
        this._listeners = {};
        electron.ipcRenderer.on('global-shortcut-triggered', (sender, shortcut) => {
            if (this._listeners[shortcut]) {
                this._listeners[shortcut]();
            }
        });
    }
    register(shortcut, callback) {
        if (this._listeners[shortcut]) {
            return;
        }
        this._listeners[shortcut] = callback;
        electron.ipcRenderer.send('register-global-shortcut', shortcut);
    }
    unregister(shortcut) {
        if (!this._listeners[shortcut]) {
            return;
        }
        delete this._listeners[shortcut];
        electron.ipcRenderer.send('unregister-global-shortcut', shortcut);
    }
}
exports.GlobalShortcutsImpl = GlobalShortcutsImpl;
