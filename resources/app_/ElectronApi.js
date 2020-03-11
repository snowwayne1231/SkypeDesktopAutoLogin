"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron = require("electron");
const os = require("os");
const path = require("path");
const reactxp_file_encryption_1 = require("reactxp-file-encryption");
const AppSettings_1 = require("./AppSettings");
const AutoStart_1 = require("./auto-start/AutoStart");
const ClipboardManager_1 = require("./ClipboardManager");
const Configuration_1 = require("./configuration/Configuration");
const constants = require("./Constants");
const ContactsExporter_1 = require("./ContactsExporter");
const DelphiMigration_1 = require("./migration/DelphiMigration");
const DeviceInfo_1 = require("./DeviceInfo");
const DownloadManager_1 = require("./DownloadManager");
const EnvironmentInfoProvider_1 = require("./EnvironmentInfoProvider");
const FileEncryption_1 = require("./FileEncryption");
const GeolocationService_1 = require("./geolocation/GeolocationService");
const GlobalShortcuts_1 = require("./GlobalShortcuts");
const GoogleAuthProvider_1 = require("./external-auth-providers/GoogleAuthProvider");
const HighContrast_1 = require("./accessibility/HighContrast");
const ImageResizer_1 = require("./ImageResizer");
const JsExceptionHandler_1 = require("./JsExceptionHandler");
const KeychainStore_1 = require("./login/KeychainStore");
const LanguageInit_1 = require("./localisation/LanguageInit");
const LogsProvider_1 = require("./LogsProvider");
const MainWindow_1 = require("./MainWindow");
const PopupWindowController_1 = require("./PopupWindowController");
const RendererContextMenu_1 = require("./RendererContextMenu");
const ScreenshotProvider_1 = require("./ScreenshotProvider");
const Settings_1 = require("./Settings");
const SsidStore_1 = require("./SsidStore");
const SystemIdle_1 = require("./presence/SystemIdle");
const SystemTheme_1 = require("./tools/SystemTheme");
const ipc = electron.ipcRenderer;
const app = electron.remote ? electron.remote.app : electron.app;
const screen = electron.remote ? electron.remote.screen : electron.screen;
const logsPath = path.join(app.getPath('userData'), Configuration_1.default.log.logsPath);
const slimcoreLogPath = path.join(app.getPath('userData'), 'skylib');
const mediaLogPath = path.join(app.getPath('userData'), 'media-stack');
const webViewBridgePreloadPath = 'file://' + path.join(app.getAppPath(), 'WebViewPreload.js');
exports.webViewBridgeChannelName = '__WebViewBridgeChannel__';
class ElectronApi {
    constructor() {
        this.webViewBridgePreloadPath = webViewBridgePreloadPath;
        this.webViewBridgeChannelName = exports.webViewBridgeChannelName;
        this.screenshotProvider = ScreenshotProvider_1.getInstance();
        this.logsProvider = new LogsProvider_1.LogsProvider(logsPath, slimcoreLogPath, mediaLogPath, this.screenshotProvider);
        this.downloadManager = DownloadManager_1.getInstance();
        this.environmentInfoProvider = EnvironmentInfoProvider_1.getInstance();
        this.imageResizer = new ImageResizer_1.ImageResizer();
        this.clipboardManager = ClipboardManager_1.getInstance();
        this.contextMenu = new RendererContextMenu_1.RendererContextMenu();
        this.keychain = KeychainStore_1.getInstance();
        this.geolocation = GeolocationService_1.getInstance();
        this.googleAuthProvider = new GoogleAuthProvider_1.GoogleAuthProvider();
        this.globalShortcuts = new GlobalShortcuts_1.GlobalShortcutsImpl();
        reactxp_file_encryption_1.FileEncryption.useImplementation(FileEncryption_1.getInstance());
        this.migration = new Promise((resolve, reject) => {
            ipc.on('migration-ready', (event, data) => resolve(data));
        });
    }
    checkForUpdates() {
        ipc.send('check-for-updates');
    }
    notifyStartupEnded() {
        ipc.send('application-startup-end');
    }
    notifyUserAuth(username, isGuest) {
        ipc.send('authentication-user-change', username, isGuest);
    }
    notifyAppReloading() {
        ipc.send('application-reloading');
    }
    displayTrayBalloon(title, content) {
        ipc.send('display-tray-balloon', title, content);
    }
    beforeWindowHide(callback) {
        ipc.on('before-window-hide', (event) => {
            callback();
        });
    }
    on(channel, listener) {
        ipc.on(channel, listener);
    }
    once(channel, listener) {
        ipc.once(channel, listener);
    }
    openWindowAndReturnRedirectUrl(url, shouldAppCloseOnInterruptedLogin, expectedUrl, loadOptions) {
        if (!expectedUrl) {
            expectedUrl = 'https://login.live.com/oauth20_desktop.srf';
        }
        ipc.send('open-new-window', url, shouldAppCloseOnInterruptedLogin, expectedUrl, loadOptions);
        return new Promise((resolve, reject) => {
            ipc.on('redirected-to-page', (event, data) => {
                resolve(data);
            });
            ipc.on('window-closed', () => {
                reject();
            });
        });
    }
    setWindowSize(width, height, animated) {
        ipc.send('window-set-size', width, height, animated);
    }
    setResizable(resizable) {
        ipc.send('window-set-resizable', resizable);
    }
    setMaximizable(maximizable) {
        ipc.send('window-set-maximizable', maximizable);
    }
    windowCenter() {
        ipc.send('window-center');
    }
    quitAndUpdate() {
        ipc.send('update-quit-and-install');
    }
    quitApp() {
        ipc.send('app-quit');
    }
    windowClose() {
        ipc.send('window-close');
    }
    windowMinimize() {
        ipc.send('window-minimize');
    }
    windowMaximize(id) {
        ipc.send('window-maximize', id);
    }
    windowToggleMaximize() {
        ipc.send('window-toggle-maximize');
    }
    blockScreenSaver(block) {
        ipc.send('block-screen-saver', block);
    }
    toggleSharingIndicator(show, position, windowID) {
        if (show) {
            ipc.send('sharingIndicator:show', position ? position : windowID);
        }
        else {
            ipc.send('sharingIndicator:hide');
        }
    }
    displayVideoDeviceSettings(parentWindowHandle, deviceId) {
        let msg = {
            parentWindowHandle: parentWindowHandle,
            deviceId: deviceId
        };
        ipc.send('sharingIndicator:displayVideoDeviceSettings', msg);
    }
    sendToControlInjector(command, ...args) {
        ipc.send(`controlInjector:${command}`, ...args);
    }
    getSystemLocale() {
        return LanguageInit_1.language.getDetectedSystemLocale();
    }
    getLocaleCountryCode() {
        return app.getLocaleCountryCode();
    }
    setLocale(locale) {
        LanguageInit_1.language.setLocale(locale);
    }
    resetLocale() {
        LanguageInit_1.language.setLocale();
        return LanguageInit_1.language.getDetectedSystemLocale();
    }
    setBadgeCount(count) {
        ipc.send('badgeCount', count);
    }
    getCurrentWindowsNativeHandle() {
        return electron.remote.getCurrentWindow().getNativeWindowHandle();
    }
    getCurrentWindowPosition() {
        return electron.remote.getCurrentWindow().getPosition();
    }
    getCurrentWindowSize() {
        const size = electron.remote.getCurrentWindow().getSize();
        return {
            width: size[0],
            height: size[1]
        };
    }
    getCurrentWindowContentSize() {
        const size = electron.remote.getCurrentWindow().getContentSize();
        return {
            width: size[0],
            height: size[1]
        };
    }
    isWindows() {
        return process.platform === 'win32';
    }
    isFullScreen() {
        return ipc.sendSync('window-is-fullscreen');
    }
    isMaximized(id) {
        return ipc.sendSync('window-is-maximized', id);
    }
    setFullScreen(fullScreenMode) {
        ipc.send('window-set-fullscreen', fullScreenMode);
    }
    getCurrentSkypeURI() {
        return ipc.sendSync('current-skype-uri');
    }
    getDefaultWindowSize() {
        return MainWindow_1.defaultWindowSize;
    }
    getLoginWindowSize() {
        return MainWindow_1.defaultLoginWindowSize;
    }
    getFingerprintData() {
        const Fingerprint = electron.remote.require('./Fingerprint');
        return Fingerprint.getFingerprintData();
    }
    openHistoryExporter() {
        ipc.send('open-history-exporter');
    }
    openThirdPartyNotices() {
        electron.shell.openItem(constants.thirdPartyNoticesFile);
    }
    showOpenDialog(options, callback) {
        if (electron.remote) {
            electron.remote.dialog.showOpenDialog(options, filename => {
                if (!!filename && !!callback) {
                    callback(filename);
                }
            });
        }
    }
    createPopupWindow(prefix, options) {
        options = options || {};
        options.webPreferences = options.webPreferences || {};
        options.webPreferences.additionalArguments = options.webPreferences.additionalArguments || [];
        options.webPreferences.additionalArguments.push(`--skype-process-type=${prefix}`);
        return new PopupWindowController_1.PopupWindowProxy(prefix, options);
    }
    supportsTransparency() {
        return process.platform !== 'win32';
    }
    isMainWindowVisible() {
        return electron.remote.getCurrentWindow().isVisible();
    }
    focusMainWindow() {
        ipc.send('window-focus-called');
    }
    focusWindow(id) {
        ipc.send('focus-window', id);
    }
    setWindowTitle(id, text) {
        ipc.send('window-title', id, text);
    }
    getTargetDisplayScalingFactor(windowRect) {
        if (!windowRect) {
            return screen.getPrimaryDisplay().scaleFactor;
        }
        const dip = screen.screenToDipPoint({ x: windowRect['x'], y: windowRect['y'] });
        const smallWindowSize = 10;
        return screen.getDisplayMatching({
            x: dip.x,
            y: dip.y,
            width: smallWindowSize,
            height: smallWindowSize
        }).scaleFactor;
    }
    primaryDisplaySize() {
        return screen.getPrimaryDisplay().workAreaSize;
    }
    windowSetTouchbarApi(touchBar) {
        if (process.platform !== 'darwin') {
            return;
        }
        ipc.send('window-set-touchbar-api', touchBar);
    }
    getDeviceContacts() {
        return ContactsExporter_1.contactsExporter.getDeviceContacts();
    }
    handleException(message, source, fileNo, columnNo, errName, stackTrace, logs) {
        let exceptionData = { message, source, fileNo, columnNo, errName, stackTrace, logs };
        JsExceptionHandler_1.getInstance().handleExceptionRenderer(exceptionData);
        return false;
    }
    writeToUnifiedLogMemory(logLine) {
        return electron.crashReporter.writeToUnifiedLogMemory(logLine);
    }
    getAppSettings() {
        return AppSettings_1.appSettings.get();
    }
    changeAppSettings(appSettingsDelta) {
        AppSettings_1.appSettings.change(appSettingsDelta);
    }
    flashTaskbarIcon(flash, id) {
        ipc.send('flash-taskbar-icon', flash, id);
    }
    isAutoStartSupported() {
        return !!AutoStart_1.autoStart;
    }
    isRunningUnderWayland() {
        return process.platform === 'linux' && 'XDG_SESSION_TYPE' in process.env && process.env['XDG_SESSION_TYPE'] === 'wayland';
    }
    didCrashInLastSession() {
        let didCrash = Settings_1.settings.get(Settings_1.SettingsKeys.Crashed, false);
        if (didCrash) {
            Settings_1.settings.delete(Settings_1.SettingsKeys.Crashed);
        }
        return didCrash;
    }
    getDeviceId() {
        return DeviceInfo_1.deviceInfo.getId();
    }
    getDeviceName() {
        return ipc.sendSync('get-device-name');
    }
    isFocused() {
        return ipc.sendSync('window-is-focused');
    }
    getSSID() {
        return new Promise(resolve => {
            this.once(SsidStore_1.GetSSIDResponse, (event, ssid) => {
                resolve(ssid || undefined);
            });
            ipc.send(SsidStore_1.GetSSIDRequest);
        });
    }
    presenceStatusUpdated(status) {
        ipc.send('presence-status-change', status);
    }
    ackExit() {
        ipc.send('app-exit-ack');
    }
    isHighContrastEnabled() {
        return ipc.sendSync(HighContrast_1.IsSystemHighContrastEnabled);
    }
    isDelphiMigration() {
        return DelphiMigration_1.delphiMigration.isMigration;
    }
    getHostname() {
        return os.hostname();
    }
    isSystemIdle() {
        return ipc.sendSync(SystemIdle_1.SystemIdleIpcChannel);
    }
    isDarkMode() {
        return ipc.sendSync(SystemTheme_1.SystemDarkThemeIpcChannel);
    }
    setConversationNavigationMenuItemsVisible(value) {
        return ipc.send('menu-update-show-conversation-navigation', value);
    }
    setPasteAsPlainTextOption(value) {
        return ipc.send('set-paste-as-plain-text', value);
    }
    crashApp() {
        ipc.send('crash-app');
        return Promise.resolve();
    }
}
exports.ElectronApi = ElectronApi;
