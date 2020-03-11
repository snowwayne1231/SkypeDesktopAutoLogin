"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = require("crypto");
const electron = require("electron");
const os = require("os");
const _ = require("lodash");
const Events_1 = require("./telemetry/Events");
const HttpsRequest_1 = require("./HttpsRequest");
const Settings_1 = require("./Settings");
const TelemetryLoggerInit_1 = require("./telemetry/TelemetryLoggerInit");
exports.mainWindowUnloadMsgName = 'main-window-unloading';
const MAX_RELOADS = 3;
class JsExceptionHandler {
    constructor(configuration, logger, clientVersion, deviceInfo, environmentInfoProvider) {
        this._crashCount = 0;
        this._configuration = configuration;
        this._logger = logger;
        this._clientVersion = clientVersion;
        this._deviceInfo = deviceInfo;
        this._environmentInfoProvider = environmentInfoProvider;
    }
    handleExceptionRenderer(exceptionData) {
        this._logger.error('[JsExceptionHandler] Uncaught exception from renderer: ', exceptionData);
        this._crashCount++;
        let message = exceptionData.stackTrace || exceptionData.message || JSON.stringify(exceptionData);
        let logs = exceptionData.logs;
        this._sendCrashReport(message, 'renderer', () => { this._reloadOrRelaunch(); }, logs);
    }
    registerExceptionHandlerMain() {
        process.on('uncaughtException', (err) => {
            this._logger.error('[JsExceptionHandler] Uncaught exception from main: ', err);
            let stack = '';
            if (err) {
                stack = err.stack || err.message;
            }
            this._sendCrashReport(stack, 'main');
        });
        let initError = this._deviceInfo.getErrorMessage() || '';
        if (initError) {
            this._sendCrashReport(initError, 'init');
        }
    }
    registerWindowListeners(mainWindow) {
        if (mainWindow) {
            this._mainWindow = mainWindow;
            this._mainWindow.window.on('unresponsive', () => {
                this._logger.error('[JsExceptionHandler] Application got unresponsive');
                TelemetryLoggerInit_1.telemetryLogger.log(new Events_1.RendererCrashedEvent('unresponsive'));
            });
            this._mainWindow.webContents.on('crashed', (event, killed) => {
                this._logger.error(`[JsExceptionHandler] Renderer crashed. Killed: ${killed}`);
                TelemetryLoggerInit_1.telemetryLogger.log(new Events_1.RendererCrashedEvent('crashed', killed));
                this._notifyMainWindowUnload();
                this._crashCount++;
                if (!killed) {
                    _.defer(() => this._reloadOrRelaunch());
                }
            });
            this._mainWindow.webContents.on('did-navigate', () => {
                this._logger.info('[JsExceptionHandler] Main window navigated');
                TelemetryLoggerInit_1.telemetryLogger.log(new Events_1.RendererCrashedEvent('did-navigate'));
                this._notifyMainWindowUnload();
            });
        }
    }
    _persistCrashed() {
        Settings_1.settings.set(Settings_1.SettingsKeys.Crashed, true);
    }
    _reloadOrRelaunch() {
        this._persistCrashed();
        if (this._mainWindow && this._crashCount <= MAX_RELOADS) {
            this._logger.info('[JsExceptionHandler] Reloading the renderer');
            this._closeAllChildWindows(this._mainWindow);
            this._environmentInfoProvider.setAppReloaded();
            this._mainWindow.webContents.reload();
        }
        else {
            this._logger.info('[JsExceptionHandler] Quitting the application');
            electron.app.quit();
        }
    }
    _sendCrashReport(stack, source, callback, logs) {
        if (this._configuration.crashReporterUrl) {
            let boundary = 'boundary-' + crypto.randomBytes(7).toString('hex');
            let crlf = '\r\n';
            let now = new Date().toString();
            let data = '';
            data += `--${boundary}${crlf}`;
            data += `Content-Disposition: form-data; name="log"; filename="log.txt"${crlf}`;
            data += `Content-Type: text/plain; charset=utf-8${crlf}${crlf}`;
            data += `Package: ${this._configuration.appShortName}${crlf}`;
            data += `Version: ${this._clientVersion.getVersion()}${crlf}`;
            data += `OS: JS - ${os.type()} ${os.release()}${crlf}`;
            data += `Date: ${now}${crlf}`;
            data += `process_type: javascript_${source}${crlf}`;
            data += `environment: ${this._configuration.environment}${crlf}`;
            data += `CrashReporter Key: ${this._deviceInfo.getId()}${crlf}`;
            if (stack) {
                data += `${crlf}${stack}${crlf}`;
            }
            if (logs) {
                data += '--' + boundary + crlf;
                data += `Content-Disposition: form-data; name="attachment0"; filename="attachment0.txt"${crlf}`;
                data += `Content-Type: text/plain; charset=utf-8${crlf}${crlf}`;
                data += logs;
                data += `${crlf}`;
            }
            data += '--' + boundary + '--';
            let request = new HttpsRequest_1.HttpsRequest({
                method: 'POST',
                url: this._configuration.crashReporterUrl,
                headers: {
                    'Content-Type': `multipart/form-data; boundary=${boundary}`
                },
                body: data,
                retryCountLimit: 1
            }, this._logger);
            request.send().then(responseData => {
                this._logger.debug('[JsExceptionHandler] Crash report response: ', responseData);
                if (callback) {
                    callback();
                }
            }).catch(err => {
                this._logger.error('[JsExceptionHandler] Crash report failed: ', err);
                if (callback) {
                    callback();
                }
            });
        }
        else {
            if (callback) {
                callback();
            }
        }
    }
    _notifyMainWindowUnload() {
        electron.ipcMain.emit(exports.mainWindowUnloadMsgName);
    }
    _closeAllChildWindows(mainWindow) {
        const windows = electron.BrowserWindow.getAllWindows();
        for (let win of windows) {
            if (mainWindow.window.id !== win.id) {
                win.close();
            }
        }
    }
}
exports.JsExceptionHandler = JsExceptionHandler;
function getInstance() {
    if (electron.remote) {
        return electron.remote.require(__dirname + '/JsExceptionHandler').jsExceptionHandler;
    }
    else {
        return exports.jsExceptionHandler;
    }
}
exports.getInstance = getInstance;
function init(configuration, logger, clientVersion, deviceInfo, environmentInfoProvider) {
    exports.jsExceptionHandler = new JsExceptionHandler(configuration, logger, clientVersion, deviceInfo, environmentInfoProvider);
}
exports.init = init;
