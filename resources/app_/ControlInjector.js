"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let _controlInjector;
function getInstance() {
    if (!_controlInjector) {
        const module = require('slimcore/lib/sharing-indicator');
        _controlInjector = new module.ControlInjector();
    }
    return _controlInjector;
}
exports.getInstance = getInstance;
