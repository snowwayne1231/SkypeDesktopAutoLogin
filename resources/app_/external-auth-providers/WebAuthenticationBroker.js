"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const SyncTasks = require("synctasks");
var AuthenticationStatus;
(function (AuthenticationStatus) {
    AuthenticationStatus[AuthenticationStatus["Success"] = 0] = "Success";
    AuthenticationStatus[AuthenticationStatus["PermissionsDenied"] = 1] = "PermissionsDenied";
    AuthenticationStatus[AuthenticationStatus["UserCancel"] = 2] = "UserCancel";
    AuthenticationStatus[AuthenticationStatus["HttpError"] = 3] = "HttpError";
    AuthenticationStatus[AuthenticationStatus["UnexpectedResponse"] = 4] = "UnexpectedResponse";
    AuthenticationStatus[AuthenticationStatus["UnexpectedError"] = 5] = "UnexpectedError";
    AuthenticationStatus[AuthenticationStatus["NotImplemented"] = 99] = "NotImplemented";
})(AuthenticationStatus = exports.AuthenticationStatus || (exports.AuthenticationStatus = {}));
class WebAuthenticationBroker {
    constructor() {
        this.authenticateAsync = (requestUrl, redirectUrl, authSession, windowOptions) => {
            if (this._authWindowInstance && !this._authWindowInstance.isDestroyed()) {
                this._closeAndCleanup();
            }
            let deferHandled = false;
            const defer = SyncTasks.Defer();
            this._authWindowInstance = new electron_1.remote.BrowserWindow(Object.assign({}, windowOptions, { webPreferences: { session: authSession } }));
            this._authWindowInstance.on('closed', () => {
                if (!deferHandled) {
                    defer.reject(AuthenticationStatus[AuthenticationStatus.UserCancel]);
                    deferHandled = true;
                }
                this._cleanup();
            });
            this._authWindowInstance.on('blur', () => {
                if (!deferHandled) {
                    defer.reject(AuthenticationStatus[AuthenticationStatus.UserCancel]);
                    deferHandled = true;
                }
                this._closeAndCleanup();
            });
            this._authWindowInstance.webContents.on('did-finish-load', () => {
                if (this._authWindowInstance && !this._authWindowInstance.isDestroyed()) {
                    this._authWindowInstance.show();
                }
            });
            this._authWindowInstance.webContents.on('did-fail-load', () => {
                if (!deferHandled) {
                    defer.reject(AuthenticationStatus[AuthenticationStatus.UnexpectedError]);
                    deferHandled = true;
                }
                this._closeAndCleanup();
            });
            const filter = {
                urls: [redirectUrl + '*']
            };
            this._authWindowInstance.webContents.session.webRequest.onCompleted(filter, details => {
                const url = details.url;
                const unescapedUrl = unescape(url);
                if (!deferHandled) {
                    defer.resolve({
                        status: AuthenticationStatus.Success,
                        data: unescapedUrl.replace(redirectUrl, '').trim()
                    });
                    deferHandled = true;
                }
                this._closeAndCleanup();
            });
            this._authWindowInstance.setMenu(null);
            this._authWindowInstance.loadURL(requestUrl);
            return defer.promise();
        };
        this._closeAndCleanup = () => {
            this._cleanup();
            if (this._authWindowInstance && !this._authWindowInstance.isDestroyed()) {
                this._authWindowInstance.close();
            }
            this._authWindowInstance = undefined;
        };
        this._cleanup = () => {
            if (this._authWindowInstance && !this._authWindowInstance.isDestroyed()) {
                this._authWindowInstance.webContents.removeAllListeners();
                this._authWindowInstance.webContents.clearHistory();
            }
        };
        electron_1.ipcRenderer.on('before-window-hide', () => this._closeAndCleanup());
        electron_1.ipcRenderer.on('window-minimize', () => this._closeAndCleanup());
    }
}
exports.default = new WebAuthenticationBroker();
