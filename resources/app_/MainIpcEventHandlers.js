"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron = require("electron");
const _ = require("lodash");
const SharingIndicatorModule = require("slimcore/lib/sharing-indicator");
const ControlInjector = require("./ControlInjector");
const JsExceptionHandler_1 = require("./JsExceptionHandler");
const Logger_1 = require("./logger/Logger");
let _sharingIndicator;
let _logger;
function _showSharingIndicator(position, windowId) {
    if (!_sharingIndicator) {
        let module;
        try {
            module = require('slimcore/lib/sharing-indicator');
        }
        catch (error) {
            _logger.error(`[MainIpcEventHandlers] sharing-indicator loading failed: ${error}`);
            return;
        }
        _logger.info(`[MainIpcEventHandlers] New sharing indicator on position: ${JSON.stringify(position)}`);
        _sharingIndicator = new module.SharingIndicator({
            position: position,
            borderColor: { red: 0xD6 / 0xFF, green: 0x11 / 0xFF, blue: 0x21 / 0xFF, alpha: 1.0 },
            lineWidth: 5.0
        });
    }
    if (position) {
        _logger.info(`Moving existing sharing indicator to position: ${JSON.stringify(position)}`);
        _sharingIndicator.setPosition(position);
        return;
    }
    if (windowId) {
        _logger.info('Moving existing sharing indicator to windowId: ' + windowId);
        _sharingIndicator.setWindow(windowId);
    }
}
function _hideSharingIndicator() {
    _logger.debug(`[MainIpcEventHandlers] Hiding sharing indicator`);
    if (_sharingIndicator) {
        _sharingIndicator.dispose();
        _sharingIndicator = undefined;
    }
}
let powerSaveBlockerId;
function _setScreenSaver(block) {
    _logger.debug(`[MainIpcEventHandlers] powerSaveBlocker: ${block}`);
    if (block) {
        if (typeof powerSaveBlockerId === 'undefined') {
            powerSaveBlockerId = electron.powerSaveBlocker.start('prevent-display-sleep');
        }
        else {
            _logger.warn('[MainIpcEventHandlers] You are trying to block already blocked screen saver!');
        }
    }
    else {
        if (typeof powerSaveBlockerId === 'number' &&
            electron.powerSaveBlocker.isStarted(powerSaveBlockerId)) {
            electron.powerSaveBlocker.stop(powerSaveBlockerId);
            powerSaveBlockerId = undefined;
        }
    }
}
function _initializeControlInjectorIpcEventHandlers() {
    const ipcMain = electron.ipcMain;
    ipcMain.on('controlInjector:set-injector-config', (event, config) => {
        try {
            ControlInjector.getInstance().setInjectorConfig(config);
            _logger.debug('[MainIpcEventHandlers] controlInjector-complete { action: set-injector-config }');
        }
        catch (error) {
            _logger.error('[MainIpcEventHandlers] controlInjector-error '
                + `{ action: set-injector-config error: ${error} config: ${JSON.stringify(config)} }`);
        }
    });
    ipcMain.on('controlInjector:control-data', (event, buffer, sourceId) => {
        try {
            ControlInjector.getInstance().injectRawInput(buffer, sourceId);
            _logger.debug('[MainIpcEventHandlers] controlInjector-complete { action: control-data buffer: ${JSON.stringify(buffer)}}');
        }
        catch (error) {
            _logger.error('[MainIpcEventHandlers] controlInjector-error '
                + `{ action: control-data error: ${error} buffer: ${JSON.stringify(buffer)} sourceId: ${sourceId} }`);
        }
    });
    ipcMain.on('controlInjector:set-injection-rect', (event, rect) => {
        try {
            ControlInjector.getInstance().setInjectionRect(rect);
            _logger.debug('[MainIpcEventHandlers] controlInjector-complete { action: set-injection-rect }');
        }
        catch (error) {
            _logger.error('[MainIpcEventHandlers] controlInjector-error '
                + `{ action: set-injection-rect error: ${error} } rect: ${JSON.stringify(rect)}`);
        }
    });
    ipcMain.on('controlInjector:allow-single-controller', (event, id) => {
        try {
            ControlInjector.getInstance().allowSingleController(id);
            _logger.debug('[MainIpcEventHandlers] controlInjector-complete { action: allow-single-controller }');
        }
        catch (error) {
            _logger.error(`[MainIpcEventHandlers] controlInjector-error { action: allow-single-controller error: ${error} }`);
        }
    });
    ipcMain.on('controlInjector:set-avatar', (event, buffer, sourceId) => {
        try {
            ControlInjector.getInstance().setAvatar(buffer, sourceId);
            _logger.debug('[MainIpcEventHandlers] controlInjector-complete { action: set-avatar }');
        }
        catch (error) {
            _logger.error(`[MainIpcEventHandlers] controlInjector-error { action: set-avatar error: ${error} }`);
        }
    });
}
function initializeMainIpcEventHandlers() {
    const ipcMain = electron.ipcMain;
    _logger = Logger_1.getInstance();
    ipcMain.on('sharingIndicator:show', (event, positionOrWindowId) => {
        if (_.isNumber(positionOrWindowId)) {
            _showSharingIndicator(undefined, positionOrWindowId);
        }
        else {
            _showSharingIndicator(positionOrWindowId);
        }
    });
    ipcMain.on('sharingIndicator:hide', (event) => {
        _hideSharingIndicator();
    });
    ipcMain.on(JsExceptionHandler_1.mainWindowUnloadMsgName, (event) => {
        _hideSharingIndicator();
    });
    ipcMain.on('block-screen-saver', (event, block) => {
        _setScreenSaver(block);
    });
    ipcMain.on('sharingIndicator:displayVideoDeviceSettings', (event, data) => {
        SharingIndicatorModule.displayVideoDeviceSetting(data.parentWindowHandle, data.deviceId);
    });
    ipcMain.on('register-global-shortcut', (event, shortcut) => {
        if (electron.globalShortcut.isRegistered(shortcut)) {
            _logger.error(`[MainIpcEventHandlers] register-global-shortcut - shortcut ${shortcut} already registered by this app`);
        }
        _logger.debug(`[MainIpcEventHandlers] register-global-shortcut - shortcut ${shortcut}`);
        electron.globalShortcut.register(shortcut, () => {
            _logger.debug(`[MainIpcEventHandlers] shortcut triggered - shortcut ${shortcut}`);
            event.sender.send('global-shortcut-triggered', shortcut);
        });
    });
    ipcMain.on('unregister-global-shortcut', (event, shortcut) => {
        _logger.debug(`[MainIpcEventHandlers] unregister-global-shortcut - shortcut ${shortcut}`);
        electron.globalShortcut.unregister(shortcut);
    });
    _initializeControlInjectorIpcEventHandlers();
}
exports.default = initializeMainIpcEventHandlers;
