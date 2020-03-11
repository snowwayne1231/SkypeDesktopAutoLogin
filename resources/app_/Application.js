"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const parseArgs = require("minimist");
const ApplicationMenu_1 = require("./ApplicationMenu");
const AppSettings_1 = require("./AppSettings");
const ArgFilter_1 = require("./security/ArgFilter");
const AuthStore_1 = require("./login/AuthStore");
const AutoStart_1 = require("./auto-start/AutoStart");
const constants = require("./Constants");
const CredentialsMigration_1 = require("./migration/CredentialsMigration");
const DelphiMigration_1 = require("./migration/DelphiMigration");
const EcsConfig_1 = require("./ecs/EcsConfig");
const EcsConfigInit_1 = require("./ecs/EcsConfigInit");
const EnvironmentInfoProvider_1 = require("./EnvironmentInfoProvider");
const Events_1 = require("./telemetry/Events");
const ExporterDialog_1 = require("./ExporterDialog");
const fileInterceptor = require("./security/FileInterceptor");
const FileLogRetention_1 = require("./logger/FileLogRetention");
const JsExceptionHandler_1 = require("./JsExceptionHandler");
const LanguageInit = require("./localisation/LanguageInit");
const Localisation_1 = require("./localisation/Localisation");
const MainWindow_1 = require("./MainWindow");
const platform = require("./tools/Platform");
const PopupWindowController_1 = require("./PopupWindowController");
const PresenceStatus_1 = require("./presence/PresenceStatus");
const ReportReboot_1 = require("./updater/ReportReboot");
const Settings_1 = require("./Settings");
const SkypeTray_1 = require("./tray/SkypeTray");
const SkypeUri_1 = require("./SkypeUri");
const T1SettingsMigrator_1 = require("./migration/T1SettingsMigrator");
const TelemetryLoggerInit_1 = require("./telemetry/TelemetryLoggerInit");
const UpdateEventType_1 = require("./updater/UpdateEventType");
const Updater_1 = require("./updater/Updater");
const User_1 = require("./tools/User");
const windowInterceptor = require("./security/WindowInterceptor");
class Application {
    constructor(configuration, logger, clientVersion, localisation, updater) {
        this.isReady = false;
        this.cleanupRunning = false;
        this.installOnQuit = false;
        this._handleApplicationStarted = () => {
            this.logger.info('[Application] App startup sequence ended.');
            if (this.updateDetails && this.mainWindow) {
                this.mainWindow.webContents.send(UpdateEventType_1.updateEventName.UpdateDownloaded, this.updateDetails);
            }
        };
        this._handleApplicationReloading = () => {
            this.logger.info('[Application] App reloading.');
            EnvironmentInfoProvider_1.getInstance().setAppReloaded();
        };
        if (!configuration) {
            throw new Error('Invalid argument: configuration must not be null!');
        }
        if (!logger) {
            throw new Error('Invalid argument: logger must not be null!');
        }
        if (!clientVersion) {
            throw new Error('Invalid argument: clientVersion must not be null!');
        }
        this.configuration = configuration;
        this.localisation = localisation;
        this.logger = logger;
        this.clientVersion = clientVersion;
        this.updater = updater;
        this.authStore = AuthStore_1.getInstance();
        this.jsExceptionHandler = JsExceptionHandler_1.getInstance();
        this._registerUpdateEventHandlers();
        this._registerUrlHandler();
        this.args = parseArgs(process.argv.slice(1));
        logger.info('[Application] Commandline arguments:', this.args);
        this._applyArgumentSecurityFilter();
        windowInterceptor.install();
        DelphiMigration_1.delphiMigration.isMigration = !!this.args.migration;
    }
    start() {
        if (electron_1.app.setAppUserModelId) {
            electron_1.app.setAppUserModelId(constants.appUserModelId);
        }
        if (this.args['datapath']) {
            electron_1.app.setPath('userData', this.args['datapath']);
        }
        let shouldQuit = !this.args['secondary'] && !electron_1.app.requestSingleInstanceLock();
        if (shouldQuit || this.args['shutdown']) {
            this.quit();
            return;
        }
        electron_1.app.on('second-instance', (event, argv, cwd) => this._runInFirstInstance(argv));
        this._registerInstallerListener();
        let pendingInstaller = this.updater.installWindowsMandatoryUpdatesIfPresent();
        if (pendingInstaller) {
            return;
        }
        const credentialsCopied = CredentialsMigration_1.copyOldCredentials();
        this.logger.info(`[Application] T1 files copied: ${credentialsCopied}`);
        this._autoStart();
        this.t1SettingsMigrator = new T1SettingsMigrator_1.T1SettingsMigrator();
        LanguageInit.init();
        this.appMenu = new ApplicationMenu_1.ApplicationMenu(this);
        fileInterceptor.install();
        this._updateUserTasks(true);
        this.mainWindow = this._createMainWindow();
        this._updateMenu(this.menu);
        this.appIcon = new SkypeTray_1.SkypeTray(this, this.configuration);
        this.skypeUri = this._registerSkypeUri();
        this._installAppLifecycleHandlers(this.mainWindow);
        this._registerLocaleChangeListener();
        this._registerPowerMonitorHandlers();
        this._initEcs();
        this.mainWindow.loadApplication();
        this.popupWindowController = new PopupWindowController_1.PopupWindowController(this.logger);
        this.isReady = true;
        TelemetryLoggerInit_1.telemetryLogger.log(new Events_1.StartupEvent(User_1.getInstance().isAdminString()));
        if (DelphiMigration_1.delphiMigration.isMigration) {
            this.logger.info('[Application] UpgradedFromDelphi: true');
            Settings_1.settings.set(Settings_1.SettingsKeys.UpgradedFromDelphi, true);
            Settings_1.settings.set(Settings_1.SettingsKeys.UpgradedFromDelphiDate, new Date().toISOString());
        }
        if (Settings_1.settings.get(Settings_1.SettingsKeys.UpgradedFromDelphi)) {
            TelemetryLoggerInit_1.telemetryLogger.log(new Events_1.DelphiUpgradeEvent(Settings_1.settings.get(Settings_1.SettingsKeys.UpgradedFromDelphi), Settings_1.settings.get(Settings_1.SettingsKeys.UpgradedFromDelphiDate)));
        }
        ReportReboot_1.restartForUpdate().then(restarted => {
            if (restarted) {
                TelemetryLoggerInit_1.telemetryLogger.log(new Events_1.RestartForUpdateEvent());
            }
        });
        electron_1.app.on('system-idle-changed', (idle) => {
            if (this.mainWindow && this.mainWindow.hasValidWindow()) {
                this.mainWindow.webContents.send('system-idle-changed', idle);
            }
        });
        electron_1.app.on('system-theme-changed', (dark) => {
            if (this.mainWindow && this.mainWindow.hasValidWindow()) {
                this.mainWindow.webContents.send('system-theme-changed', dark);
            }
        });
        this._logsCleanup();
    }
    setMenu(menu) {
        if (!this.menu) {
            this._addMenuListeners();
        }
        this._updateMenu(menu);
    }
    getUpdater() {
        return this.updater;
    }
    quit() {
        this.logger.info(`[Application] Calling app.quit`);
        electron_1.app.quit();
    }
    getMainWindow() {
        return this.mainWindow;
    }
    openHistoryExporter() {
        if (this.historyExporterDialog) {
            this.historyExporterDialog.window.show();
            return;
        }
        this.historyExporterDialog = new ExporterDialog_1.ExporterDialog();
        this.historyExporterDialog.window.on('closed', () => {
            this.historyExporterDialog = undefined;
        });
    }
    _autoStart() {
        if (!AutoStart_1.autoStart) {
            return;
        }
        if (DelphiMigration_1.delphiMigration.isMigration) {
            const appSettingsDelta = {
                autoStartEnabled: !!this.args['auto-start']
            };
            AppSettings_1.appSettings.change(appSettingsDelta);
        }
        if (AutoStart_1.autoStart) {
            AutoStart_1.autoStart.sync();
        }
    }
    _logsCleanup() {
        if (this.configuration.log.enableLogCleaning) {
            FileLogRetention_1.FileLogRetentionUtility.removeOldLogs(this.configuration, this.logger);
            setInterval(() => {
                FileLogRetention_1.FileLogRetentionUtility.removeOldLogs(this.configuration, this.logger);
            }, 1000 * 60 * 60 * 24);
        }
    }
    _registerLocaleChangeListener() {
        this.localisation.on(Localisation_1.Localisation.LocaleChangeEvent, (locale) => {
            this.logger.info(`[Application] Locale change event - reinit translated content to ${locale}`);
            this.appIcon.initTrayMenu();
            this._updateUserTasks(false);
            this._updateUserTasks(true);
            this.appMenu.reload();
            if (this.mainWindow) {
                this.mainWindow.resetWindowTitle();
            }
        });
    }
    _updateMenu(menu) {
        if (platform.isMac()) {
            electron_1.Menu.setApplicationMenu(menu);
        }
        else if (this.mainWindow && this.mainWindow.hasValidWindow()) {
            this.mainWindow.window.setMenu(menu);
        }
        this.menu = menu;
    }
    _registerInstallerListener() {
        this.updater.subscribe(Updater_1.Updater.INSTALL_UPDATE, () => {
            this.installOnQuit = true;
            if (this.mainWindow && this.mainWindow.hasValidWindow()) {
                this.mainWindow.window.hide();
            }
            this.quit();
        });
    }
    _registerSkypeUri() {
        let skypeUri = SkypeUri_1.getInstance();
        if (!skypeUri.newInstallation()) {
            skypeUri.ensureRegistered();
        }
        let argsForUri = [];
        if (this.args['_']) {
            argsForUri = this.args['_'];
        }
        if (this.storedArgs) {
            argsForUri = this.storedArgs;
        }
        skypeUri.handleArgs(argsForUri);
        return skypeUri;
    }
    _initEcs() {
        EcsConfigInit_1.getInstance().on('ecs-data-ready', () => {
            this._handleEcsSuccess();
        });
        EcsConfigInit_1.getInstance().on('ecs-data-error', () => {
            if (this.mainWindow) {
                this._handleEcsError();
            }
        });
        EcsConfigInit_1.getInstance().start();
    }
    _handleEcsSuccess() {
        let ecsConfigData = EcsConfigInit_1.getInstance().getData();
        this.logger.info('[Application] ECS Config loaded');
        this.logger.debug('[Application] ecsConfigData is ', ecsConfigData);
    }
    _handleEcsError() {
        setTimeout(() => {
            EcsConfigInit_1.getInstance().refreshEcsConfig();
        }, EcsConfig_1.EcsConfig.retryGetIn);
    }
    _registerUpdateEventHandlers() {
        electron_1.ipcMain.on('update-quit-and-install', () => {
            this.logger.info('[Application] Quit and install update');
            this.updater.quitAndInstall();
        });
        electron_1.ipcMain.on('check-for-updates', () => {
            this.updater.checkForUpdates();
        });
        this.updater.subscribe(Updater_1.Updater.UPDATE_RESULT, (result, explicit, details) => {
            switch (result) {
                case UpdateEventType_1.UpdateEventType.UpdateDownloaded:
                case UpdateEventType_1.UpdateEventType.NoUpdateAvailable:
                case UpdateEventType_1.UpdateEventType.CheckingForUpdates:
                case UpdateEventType_1.UpdateEventType.UpdateAvailable:
                case UpdateEventType_1.UpdateEventType.Error:
                    let eventName = UpdateEventType_1.updateEventName[UpdateEventType_1.UpdateEventType[result]];
                    this.logger.info(`[Application] ${eventName}. Explicit check = ${explicit}`);
                    if (this.mainWindow && (explicit || result === UpdateEventType_1.UpdateEventType.UpdateDownloaded)) {
                        this.mainWindow.webContents.send(eventName, details);
                        this.updateDetails = details;
                    }
                    break;
                default:
                    this.logger.info(`[Application] No updates found. Explicit check = ${explicit}`);
                    break;
            }
        });
    }
    _registerUrlHandler() {
        electron_1.app.on('open-url', (event, url) => {
            event.preventDefault();
            let urlToArgs = [url];
            if (this.isReady && this.mainWindow) {
                this.mainWindow.showAndFocus();
                this.skypeUri.handleArgs(urlToArgs);
            }
            else {
                this.storedArgs = urlToArgs;
            }
        });
    }
    _registerPowerMonitorHandlers() {
        electron_1.powerMonitor.on('resume', () => {
            if (this.mainWindow) {
                this.mainWindow.webContents.send('resume');
            }
        });
        electron_1.powerMonitor.on('suspend', () => {
            if (this.mainWindow) {
                this.mainWindow.webContents.send('suspend');
            }
        });
    }
    _runInFirstInstance(argv) {
        let argumentList = parseArgs(argv.slice(1));
        if (argumentList['shutdown']) {
            this.quit();
            return;
        }
        if (this.mainWindow) {
            this.mainWindow.showAndFocus();
        }
        this.logger.info('[Application] Attempted to run second instance without secondary parameter');
        this.logger.info('[Application] Commandline arguments:', argumentList);
        if (argumentList['_']) {
            if (this.skypeUri) {
                this.skypeUri.handleArgs(argumentList['_']);
            }
        }
    }
    _createMainWindow() {
        let mainWindow = new MainWindow_1.MainWindow(this.configuration, this.logger, this.clientVersion, this.updater, this.localisation);
        mainWindow.registerRedirectionHook('file:///', function () {
            mainWindow.loadApplication();
        });
        return mainWindow;
    }
    _installAppLifecycleHandlers(mainWindow) {
        if (!mainWindow) {
            throw new Error('Window instance not supplied');
        }
        electron_1.app.on('window-all-closed', () => {
            this.logger.debug('[Application] Quitting as all windows were closed');
            this.quit();
        });
        electron_1.app.on('before-quit', () => {
            if (mainWindow) {
                this.logger.debug('[Application] before-quit sets allowClosing to true');
                mainWindow.allowClosing = true;
                mainWindow.window.on('close', event => {
                    if (!this.cleanupRunning && this.authStore && this.authStore.isAuthenticated()) {
                        this.logger.info('[Application] Running cleanup for MainWindow close.');
                        this._cleanup(() => {
                            if (mainWindow.hasValidWindow()) {
                                mainWindow.window.close();
                            }
                        });
                        event.preventDefault();
                    }
                    else {
                        this.logger.info('[Application] MainWindow closing.');
                    }
                });
                mainWindow.window.on('closed', () => {
                    this.logger.debug('[Application] MainWindow got closed event');
                    this.mainWindow = undefined;
                });
            }
        });
        electron_1.app.on('activate', () => {
            if (mainWindow && mainWindow.hasValidWindow() && !mainWindow.window.isVisible()) {
                mainWindow.showAndFocus();
            }
        });
        electron_1.app.on('quit', () => {
            if (this.installOnQuit) {
                this.installOnQuit = false;
                this.updater.installUpdate();
            }
            this.popupWindowController.dispose();
            this.logger.debug('[Application] App on quit stops logging');
            this.logger.stopLogging();
            this._updateUserTasks(false);
        });
        electron_1.ipcMain.on('open-history-exporter', this.openHistoryExporter);
        electron_1.ipcMain.on('application-startup-end', this._handleApplicationStarted);
        electron_1.ipcMain.on('application-reloading', this._handleApplicationReloading);
        electron_1.ipcMain.on('menu-update-show-conversation-navigation', (event, toggle) => {
            this.appMenu.setShowConversationNavigationItemsVisible(toggle);
        });
        electron_1.ipcMain.on('set-paste-as-plain-text', (event, value) => {
            this.appMenu.setPasteAsPlainTextOption(value);
        });
        electron_1.ipcMain.on('crash-app', () => {
            if (this.configuration.debugCrashEnabled) {
                this.logger.info('[Application] Crashing the application via crash-app command');
                setTimeout(() => { process.crash(); }, 300);
            }
        });
        electron_1.ipcMain.on('authentication-user-change', (event, username, isGuest) => {
            if (username) {
                this.authStore.setUsername(username);
                this.authStore.setIsGuestUser(isGuest);
                this.appMenu.reload();
                this.logger.info('[Application] User authenticated');
                this.t1SettingsMigrator.runMigration(username).then(migratedSettings => {
                    if (migratedSettings && this.mainWindow && this.mainWindow.hasValidWindow() && this.mainWindow.webContents) {
                        this.mainWindow.webContents.send('migration-ready', migratedSettings);
                        this.t1SettingsMigrator.markMigrated(migratedSettings);
                    }
                });
            }
            else {
                this.authStore.setUsername();
                this.authStore.setIsGuestUser();
                this.appMenu.reload();
                this._setPresenceStatus(PresenceStatus_1.PresenceStatus.Offline);
                this.logger.info('[Application] User logged out');
            }
        });
        electron_1.ipcMain.on('presence-status-change', (event, status) => {
            this._setPresenceStatus(status);
        });
        electron_1.ipcMain.on('display-tray-balloon', (event, title, content) => {
            this.appIcon.displayBalloon(title, content);
        });
        electron_1.ipcMain.on('get-device-name', (event) => {
            if (platform.isWindows()) {
                event.returnValue = process.env.COMPUTERNAME;
            }
            event.returnValue = undefined;
        });
        this.jsExceptionHandler.registerWindowListeners(this.mainWindow);
    }
    _setPresenceStatus(status) {
        if (this.currentStatus !== status) {
            this.logger.info(`[Application] Set presence status to ${status}.`);
            if (status === PresenceStatus_1.PresenceStatus.Unknown) {
                return;
            }
            this.currentStatus = status;
            this.appIcon.setStatus(status);
        }
    }
    _applyArgumentSecurityFilter() {
        if (ArgFilter_1.ArgFilter.isUnsecure(process.argv)) {
            process.exit(-1);
        }
    }
    _updateUserTasks(isRunning) {
        if (!platform.isWindows()) {
            return;
        }
        let quitTask = {
            title: this.localisation.getString('Menu.QuitSkypeLabel'),
            description: this.localisation.getString('Menu.QuitSkypeLabel'),
            program: process.execPath,
            arguments: '--shutdown',
            iconPath: process.execPath,
            iconIndex: 0
        };
        electron_1.app.setUserTasks(isRunning ? [quitTask] : []);
    }
    _addMenuListeners() {
        electron_1.app.on('menu-update', (menu) => {
            this._updateMenu(menu);
        });
        electron_1.app.on('menu-event', (message) => {
            if (this.mainWindow && this.mainWindow.hasValidWindow()) {
                if (!this.mainWindow.window.isFocused()) {
                    this.mainWindow.showAndFocus();
                }
                this.mainWindow.webContents.send(message);
            }
        });
    }
    _cleanup(done) {
        if (this.mainWindow && this.mainWindow.webContents && !this.cleanupRunning) {
            this.cleanupRunning = true;
            const timer = setTimeout(() => {
                electron_1.ipcMain.removeAllListeners('app-exit-ack');
                this.logger.info('[Application] Cleanup timeout.');
                done();
            }, 5000);
            electron_1.ipcMain.on('app-exit-ack', () => {
                clearTimeout(timer);
                this.logger.info('[Application] Received cleanup ack.');
                done();
            });
            this.mainWindow.webContents.send('app-exit');
        }
    }
}
exports.Application = Application;
