"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const Logger_1 = require("../logger/Logger");
class OAuthWindow {
    constructor() {
        this.expectedUrl = 'https://login.live.com/oauth20_desktop.srf';
    }
    static getInstance() {
        if (!this.instance) {
            this.instance = new OAuthWindow();
        }
        return this.instance;
    }
    setExpectedUrl(url) {
        this.expectedUrl = url;
    }
    isLoginWindowOpen() {
        return !!this.loginWindow;
    }
    destroyTheLoginWindow() {
        if (this.loginWindow && !this.loginWindow.isDestroyed()) {
            Logger_1.getInstance().info('[OAuthWindow] destroying the OAuth login window.');
            this.loginWindow.destroy();
            this.loginWindow = undefined;
        }
    }
    makeOAuthLoginWindow(url, shouldAppCloseOnInterruptedLogin = true, loadOptions) {
        let windowOptions = {
            'width': 512,
            'height': 720,
            'closable': true,
            'show': false,
            'webPreferences': {
                'nodeIntegration': false,
                'webSecurity': true,
                'additionalArguments': ['--skype-process-type=OAuth']
            }
        };
        return new Promise((resolve, reject) => {
            if (!this.loginWindow) {
                Logger_1.getInstance().info('[OAuthWindow] creating the OAuth login window.');
                this.loginWindow = new electron_1.BrowserWindow(windowOptions);
                this.loginWindow.loadURL(url, loadOptions);
                this.loginWindow.webContents.on('will-navigate', (navigateEvent, navigateUrl) => {
                    Logger_1.getInstance().info('[OAuthWindow] will-navigate in OAuth login window.');
                    if (navigateUrl.startsWith(this.expectedUrl)) {
                        Logger_1.getInstance().info('[OAuthWindow] resolving the promise with a result from will-navigate.');
                        resolve(navigateUrl);
                    }
                });
                const filter = {
                    urls: [this.expectedUrl]
                };
                this.loginWindow.webContents.session.webRequest.onBeforeRedirect(filter, details => {
                    Logger_1.getInstance().info('[OAuthWindow] onBeforeRedirect in OAuth login window.');
                    if (details.redirectURL.startsWith(this.expectedUrl)) {
                        Logger_1.getInstance().info('[OAuthWindow] resolving the promise with a result from onBeforeRedirect');
                        resolve(details.redirectURL);
                    }
                });
                this.loginWindow.webContents.on('did-finish-load', () => {
                    Logger_1.getInstance().info('[OAuthWindow] Finished loading.');
                    if (this.loginWindow) {
                        this.loginWindow.show();
                    }
                });
                this.loginWindow.on('close', (event) => {
                    if (this.loginWindow && shouldAppCloseOnInterruptedLogin) {
                        Logger_1.getInstance().info('[OAuthWindow] Login window closed without login. Quitting the app...');
                        this.loginWindow = undefined;
                        electron_1.app.quit();
                    }
                    else {
                        this.loginWindow = undefined;
                        reject();
                    }
                });
            }
            else {
                Logger_1.getInstance().info('[OAuthWindow] Error in the OAuth login flow.');
                reject();
            }
        });
    }
    focus() {
        if (this.loginWindow && !this.loginWindow.isDestroyed()) {
            this.loginWindow.focus();
        }
    }
}
exports.OAuthWindow = OAuthWindow;
