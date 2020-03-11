"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const electron = require("electron");
const _ = require("lodash");
const path = require("path");
const AppSettings_1 = require("./AppSettings");
const constants = require("./Constants");
const File_1 = require("./tools/File");
const HighContrast_1 = require("./accessibility/HighContrast");
const OAuthWindow_1 = require("./login/OAuthWindow");
const platform = require("./tools/Platform");
const ScreenMonitor_1 = require("./ScreenMonitor");
const Settings_1 = require("./Settings");
const SkypeUri_1 = require("./SkypeUri");
const TouchBarApi_1 = require("./touchbar/TouchBarApi");
const WindowBase_1 = require("./WindowBase");
const WindowsManager_1 = require("./WindowsManager");
exports.minimumWindowSize = {
    width: 360,
    height: 660
};
exports.defaultWindowSize = {
    width: 1024,
    height: 768
};
exports.defaultLoginWindowSize = {
    width: 460,
    height: 660
};
class MainWindow extends WindowBase_1.WindowBase {
    constructor(appConfig, logger, clientVersion, updater, localisation) {
        super(MainWindow._getWindowOptions(appConfig, logger, localisation), Settings_1.settings.get(Settings_1.SettingsKeys.LaunchMinimized, false));
        this._closingAllowed = false;
        this._redirectionHooks = new Map();
        this._oAuthWindow = OAuthWindow_1.OAuthWindow.getInstance();
        this._skypeUri = SkypeUri_1.getInstance();
        this._badgeCount = 0;
        this._appConfig = appConfig;
        this._localisation = localisation;
        this._logger = logger;
        this._dockBounceId = undefined;
        this._handleBadgeIcons();
        this._handleNotifications();
        this._handleWindowPosition();
        this._handleWindowClose();
        this._handleRedirectionHooks();
        this._handleOAuthLogin();
        this._handleWindowEvents();
        this._handleDisplayChanges();
        this._handleAppSettings();
        this._handleHighContrast();
        this._handleSkypeUri();
        this._handleIsWindowMaximized();
        this._handleWindowMaximized();
        if (Settings_1.settings.get(Settings_1.SettingsKeys.WindowMaximized, false) && !Settings_1.settings.get(Settings_1.SettingsKeys.LaunchMinimized, false)) {
            this.window.maximize();
        }
        if (platform.isMac()) {
            this._touchBarApi = new TouchBarApi_1.TouchBarApi(this.window);
        }
    }
    static _getWindowOptions(appConfig, logger, localisation) {
        exports.minimumWindowSize = MainWindow._fitWindowToScreen(exports.minimumWindowSize.width, exports.minimumWindowSize.height);
        let windowOptions = {
            'width': exports.defaultLoginWindowSize.width,
            'height': exports.defaultLoginWindowSize.height,
            'resizable': true,
            'maximizable': true,
            'title': localisation.getString(appConfig.appNameKey),
            'autoHideMenuBar': platform.isWindows(),
            'webPreferences': {
                'preload': path.join(electron_1.app.getAppPath(), 'Preload.js'),
                'nodeIntegration': false,
                'webviewTag': true,
                'webSecurity': true,
                'nativeWindowOpen': true,
                'nodeIntegrationInSubFrames': true,
                'additionalArguments': ['--skype-process-type=Main']
            },
            'minWidth': exports.minimumWindowSize.width,
            'minHeight': exports.minimumWindowSize.height,
            'show': false
        };
        if (platform.isLinux()) {
            windowOptions['icon'] = path.resolve(electron_1.app.getAppPath(), `../../../pixmaps/${appConfig.appShortName}.png`);
        }
        if (Settings_1.settings.has(Settings_1.SettingsKeys.MainWindowPosition)) {
            try {
                let savedPosition = Settings_1.settings.get(Settings_1.SettingsKeys.MainWindowPosition);
                let displayBounds = electron_1.screen.getDisplayMatching(savedPosition).bounds;
                if (!MainWindow._isInBounds(savedPosition, displayBounds)) {
                    logger.info('[MainWindow] Saved window position is out of display bounds. Reset.');
                    delete savedPosition.x;
                    delete savedPosition.y;
                }
                Object.assign(windowOptions, savedPosition);
            }
            catch (e) {
                logger.error('[MainWindow] corrupted window position settings.');
            }
        }
        if (appConfig.debugMenuIncluded && appConfig.debugExtensionDir) {
            const debugExtensionPath = File_1.getAbsolutePath(appConfig.debugExtensionDir);
            if (File_1.isDir(debugExtensionPath)) {
                electron.BrowserWindow.addDevToolsExtension(debugExtensionPath);
            }
        }
        logger.debug('[MainWindow] Window options:', windowOptions);
        return windowOptions;
    }
    static _isInBounds(rectangle, bounds) {
        return bounds.x <= rectangle.x && bounds.x + bounds.width >= rectangle.x + rectangle.width &&
            bounds.y <= rectangle.y && bounds.y + bounds.height >= rectangle.y + rectangle.height;
    }
    static _fitWindowToScreen(width, height) {
        const displays = electron_1.screen.getAllDisplays();
        if (displays.length) {
            const largestDisplay = _.maxBy(displays, display => display.workAreaSize.width * display.workAreaSize.height);
            if (largestDisplay) {
                width = _.clamp(width, 0, largestDisplay.workAreaSize.width);
                height = _.clamp(height, 0, largestDisplay.workAreaSize.height);
            }
        }
        return {
            width,
            height
        };
    }
    hasValidWindow() {
        return this.window && !this.window.isDestroyed();
    }
    showAndFocus() {
        if (!this.hasValidWindow()) {
            return;
        }
        if (this.window.isMinimized()) {
            this.window.restore();
        }
        this.window.show();
        this.window.focus();
        this.window.setMinimumSize(exports.minimumWindowSize.width, exports.minimumWindowSize.height);
    }
    resetWindowTitle() {
        this._updateWindowTitleWithBadge(this._badgeCount);
    }
    registerRedirectionHook(url, callback) {
        this._redirectionHooks.set(url, callback);
    }
    loadApplication() {
        this._logger.info('[MainWindow] Loading application.');
        this.window.loadURL(constants.applicationUrl);
    }
    getUrl() {
        return this.webContents.getURL();
    }
    callWhenPageLoaded(fn) {
        if (!this.webContents.isLoading()) {
            fn();
        }
        else {
            setTimeout(() => {
                this.callWhenPageLoaded(fn);
            }, 200);
        }
    }
    get allowClosing() {
        return this._closingAllowed;
    }
    set allowClosing(value) {
        this._closingAllowed = value;
    }
    _handleSkypeUri() {
        this._skypeUri.on('skype-uri-available', () => {
            this._logger.info('[MainWindow] Forwarding Skype Uri Available event');
            this.webContents.send('skype-uri-available');
        });
        electron_1.ipcMain.on('current-skype-uri', (event) => {
            event.returnValue = this._skypeUri.getUri();
        });
    }
    _handleIsWindowMaximized() {
        electron_1.ipcMain.on('window-is-maximized', (event, windowId) => {
            if (windowId) {
                const window = WindowsManager_1.default.getWindow(windowId);
                event.returnValue = window ? window.isMaximized() : false;
            }
            else {
                event.returnValue = this.window.isMaximized();
            }
        });
    }
    _handleWindowMaximized() {
        electron_1.ipcMain.on('window-maximize', (event, windowId) => {
            if (windowId) {
                const window = WindowsManager_1.default.getWindow(windowId);
                event.returnValue = window ? window.maximize() : false;
            }
            else {
                event.returnValue = this.window.maximize();
            }
        });
    }
    _handleRedirectionHooks() {
        let self = this;
        this.webContents.on('will-navigate', (event, url) => {
            this._logger.info('[MainWindow] WILL NAVIGATE: ', url);
            let callback = self._urlHasHook(url);
            if (callback !== null) {
                event.preventDefault();
                callback(url);
            }
        });
    }
    _urlHasHook(url) {
        for (let [key, value] of this._redirectionHooks) {
            if (url.startsWith(key) && value !== null) {
                this._logger.info('[MainWindow] Redirection hook found');
                return value;
            }
        }
        return null;
    }
    _handleBadgeIcons() {
        electron_1.ipcMain.on('badgeCount', (event, count) => {
            this._badgeCount = count;
            let badge = (count !== 0) ? count + '' : '';
            electron_1.app.setBadgeCount(count);
            if (this.hasValidWindow() && this.window.setOverlayIcon) {
                this.window.setOverlayIcon(this._badgeIconForNumber(badge), badge);
            }
            this._updateWindowTitleWithBadge(count);
        });
        this.window.on('page-title-updated', (event, title) => {
            event.preventDefault();
        });
    }
    _updateWindowTitleWithBadge(count) {
        this.window.setTitle(this._localisation.getString(this._appConfig.appNameKey) + (count ? ` [${count}]` : ''));
    }
    _handleNotifications() {
        electron_1.ipcMain.on('notification-activated', () => {
            this.showAndFocus();
        });
        electron_1.ipcMain.on('flash-taskbar-icon', (event, flash, windowId) => {
            if (this.hasValidWindow()) {
                const win = windowId ? WindowsManager_1.default.getWindow(windowId) || this.window : this.window;
                win.flashFrame(flash);
                if (electron.app.dock) {
                    if (this._dockBounceId && !flash) {
                        electron.app.dock.cancelBounce(this._dockBounceId);
                        this._dockBounceId = undefined;
                    }
                    else if (!this._dockBounceId && flash) {
                        this._dockBounceId = electron.app.dock.bounce();
                        if (this._dockBounceId === -1) {
                            this._dockBounceId = undefined;
                        }
                    }
                }
            }
        });
    }
    _handleOAuthLogin() {
        electron_1.ipcMain.on('open-new-window', (event, url, shouldAppCloseOnInterruptedLogin, expectedUrl, loadOptions) => {
            if (this._oAuthWindow.isLoginWindowOpen()) {
                return;
            }
            this._logger.info('[MainWindow] received an OAuth login window request.');
            this._oAuthWindow.setExpectedUrl(expectedUrl);
            this._oAuthWindow.makeOAuthLoginWindow(url, shouldAppCloseOnInterruptedLogin, loadOptions).then((resultUrl) => {
                this._logger.info('[MainWindow] responding to the OAuth login window request.');
                event.sender.send('redirected-to-page', resultUrl);
                this._oAuthWindow.destroyTheLoginWindow();
            }).catch(err => {
                this._logger.info('[MainWindow] responding with error to the OAuth login window request.', err);
                event.sender.send('window-closed');
                this._oAuthWindow.destroyTheLoginWindow();
            });
        });
        this.window.on('focus', () => {
            if (this._oAuthWindow) {
                this._oAuthWindow.focus();
            }
        });
    }
    _handleWindowEvents() {
        electron_1.ipcMain.on('window-close', () => {
            this.window.close();
        });
        electron_1.ipcMain.on('window-minimize', () => {
            this.window.minimize();
        });
        electron_1.ipcMain.on('window-set-size', (event, width, height, animated) => {
            if (this.window.isMaximized()) {
                this.window.unmaximize();
            }
            const adjustedSize = MainWindow._fitWindowToScreen(width, height);
            this._logger.debug(`[MainWindow] Set window size, requested ${width}x${height}, setting to ${adjustedSize.width}x${adjustedSize.height}`);
            this.window.setSize(adjustedSize.width, adjustedSize.height, animated);
        });
        electron_1.ipcMain.on('window-set-resizable', (event, resizable) => {
            this.window.setResizable(resizable);
        });
        electron_1.ipcMain.on('window-set-maximizable', (event, maximizable) => {
            this.window.setMaximizable(maximizable);
        });
        electron_1.ipcMain.on('window-center', (event, maximizable) => {
            this.window.center();
        });
        electron_1.ipcMain.on('window-set-fullscreen', (event, fullscreen) => {
            this.window.setFullScreen(fullscreen);
        });
        electron_1.ipcMain.on('window-is-fullscreen', (event) => {
            event.returnValue = this.window.isFullScreen();
        });
        electron_1.ipcMain.on('window-is-focused', (event) => {
            event.returnValue = this.window.isFocused();
        });
        electron_1.ipcMain.on('window-toggle-maximize', () => {
            if (this.window.isMaximized()) {
                this.window.unmaximize();
            }
            else {
                this.window.maximize();
            }
        });
        electron_1.ipcMain.on('window-focus-called', () => {
            this.showAndFocus();
        });
        electron_1.ipcMain.on('focus-window', (event, id) => {
            const win = WindowsManager_1.default.getWindow(id);
            if (win) {
                if (win.isMinimized()) {
                    win.restore();
                }
                win.focus();
            }
        });
        electron_1.ipcMain.on('window-title', (event, id, title) => {
            const win = WindowsManager_1.default.getWindow(id);
            if (win) {
                win.setTitle(title);
            }
        });
        this.window.on('enter-full-screen', () => {
            this.webContents.send('enter-full-screen');
        });
        this.window.on('leave-full-screen', () => {
            this.webContents.send('leave-full-screen');
        });
        electron_1.ipcMain.on('force-leave-full-screen', () => {
            this.window.setFullScreen(false);
        });
        electron_1.ipcMain.on('window-set-touchbar-api', (event, touchBar) => {
            this._touchBarApi.setTouchBarApi(touchBar);
        });
    }
    _handleDisplayChanges() {
        if (this._screenMonitor) {
            return;
        }
        this._screenMonitor = new ScreenMonitor_1.ScreenMonitor(this.webContents, electron.screen);
        this._screenMonitor.startHandlingEvents();
    }
    _handleHighContrast() {
        HighContrast_1.getInstance().on('high-contrast-changed', (enabled) => {
            this.webContents.send('high-contrast-changed', enabled);
        });
    }
    _handleWindowPosition() {
        this.window.on('move', () => {
            this._saveWindowPosition();
        });
        this.window.on('resize', () => {
            this._saveWindowPosition();
        });
        this.window.on('maximize', () => {
            Settings_1.settings.set(Settings_1.SettingsKeys.WindowMaximized, true);
            this.webContents.send('window-maximized');
        });
        this.window.on('unmaximize', () => {
            Settings_1.settings.set(Settings_1.SettingsKeys.WindowMaximized, false);
            this.webContents.send('window-unmaximized');
        });
        this.window.on('focus', () => {
            this.webContents.send('window-focus');
        });
        this.window.on('blur', () => {
            this.webContents.send('window-blur');
        });
        this.window.on('minimize', () => {
            this.webContents.send('window-minimize');
        });
        this.window.on('restore', () => {
            this.webContents.send('window-restore');
        });
    }
    _saveWindowPosition() {
        Settings_1.settings.set(Settings_1.SettingsKeys.WindowMaximized, this.window.isMaximized());
        Settings_1.settings.set(Settings_1.SettingsKeys.MainWindowPosition, this.window.getBounds());
    }
    _handleWindowClose() {
        this.window.on('close', event => {
            if (this.allowClosing) {
                return;
            }
            event.preventDefault();
            if (this.window.isFullScreen() && platform.isMac()) {
                this.window.once('leave-full-screen', () => {
                    this.webContents.send('before-window-hide');
                    this.window.hide();
                });
                this.window.setFullScreen(false);
            }
            else {
                if (AppSettings_1.appSettings.get().onCloseKeepRunning) {
                    this.webContents.send('before-window-hide');
                    this.window.hide();
                }
                else {
                    electron_1.app.quit();
                }
            }
        });
    }
    _badgeIconForNumber(value) {
        let suffix = /^[1-9]$/.test(value) ? `_${value}` : '';
        let file = path.join(__dirname, `images/badge/badge${suffix}.ico`);
        return value ? electron.nativeImage.createFromPath(file) : null;
    }
    _handleAppSettings() {
        AppSettings_1.appSettings.on('app-settings-changed', () => {
            this.webContents.send('app-settings-changed');
        });
    }
}
exports.MainWindow = MainWindow;
