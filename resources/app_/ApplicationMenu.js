"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const events_1 = require("events");
const path = require("path");
const AuthStore_1 = require("./login/AuthStore");
const ClientVersion_1 = require("./ClientVersion");
const Configuration_1 = require("./configuration/Configuration");
const constants = require("./Constants");
const EnvironmentInfoProvider_1 = require("./EnvironmentInfoProvider");
const LanguageInit_1 = require("./localisation/LanguageInit");
const Logger_1 = require("./logger/Logger");
const MenuShortcutDecorator_1 = require("./localisation_utilities/MenuShortcutDecorator");
const Platform_1 = require("./tools/Platform");
const SkypeUri_1 = require("./SkypeUri");
class ApplicationMenu extends events_1.EventEmitter {
    constructor(application) {
        super();
        this._logger = Logger_1.getInstance();
        this._showDebugMenu = Configuration_1.default.debugMenuIncluded;
        this._shouldShowConversationNavigationItems = false;
        this._shouldHavePasteAsPlainTextOption = false;
        this._application = application;
        this._updater = application.getUpdater();
        this._authStore = AuthStore_1.getInstance();
        this._environmentInfoProvider = EnvironmentInfoProvider_1.getInstance();
        this._setupMenuLinks();
        const menu = this._buildMenu();
        application.setMenu(menu);
        if (Configuration_1.default.debugMenuAddShortcut && !Configuration_1.default.debugMenuIncluded) {
            electron_1.globalShortcut.register('Shift+Alt+Control+D', () => {
                this._showDebugMenu = true;
                this._refreshMenu();
            });
        }
    }
    reload() {
        this._logger.info('[ApplicationMenu] Reloading menu.');
        this._setupMenuLinks();
        this._refreshMenu();
    }
    _setupMenuLinks() {
        const platform = Platform_1.getPlatformShortCode();
        const clientVersion = ClientVersion_1.getInstance().getFullVersion();
        const intsrc = '?intsrc=' + encodeURIComponent(`client-_-${platform}-_-${clientVersion}-_-menu.`);
        const setLang = `setlang=${LanguageInit_1.language.getLanguage()}`;
        const supportTrackingParams = `?p=${ClientVersion_1.getInstance().getPlatform()}&v=${ClientVersion_1.getInstance().getVersion()}&e=Desktop`;
        this._homeUrl = `https://www.skype.com/${LanguageInit_1.language.getLanguageCodeInSkypeFormat()}/${intsrc}home`;
        this._statusUrl = `https://go.skype.com/skype.status${supportTrackingParams}&${setLang}`;
        this._supportUrl = `https://go.skype.com/support.${platform}.desktop${supportTrackingParams}&${setLang}`;
        this._communityUrl = `https://go.skype.com/community.${platform}.desktop${intsrc}community&${setLang}`;
    }
    _refreshMenu() {
        const menu = this._buildMenu();
        electron_1.app.emit('menu-update', menu);
    }
    _buildMenu() {
        const menu = new electron_1.Menu();
        this._mainLabelDecorator = new MenuShortcutDecorator_1.MenuLabelDecorator();
        if (Platform_1.isMac()) {
            menu.append(this._buildAppMenuItem());
        }
        menu.append(this._buildFileMenuItem());
        menu.append(this._buildEditMenuItem());
        menu.append(this._buildViewMenuItem());
        if (Platform_1.isMac()) {
            menu.append(this._buildWindowMenuItem());
        }
        menu.append(this._buildToolsMenuItem());
        menu.append(this._buildHelpMenuItem());
        if (this._showDebugMenu) {
            menu.append(this._buildDebugMenu());
        }
        return menu;
    }
    _buildSeparator(visible = true) {
        return visible ? [{
                type: 'separator',
                visible: true
            }] : [];
    }
    _buildAppMenuItem() {
        const labelDecorator = new MenuShortcutDecorator_1.MenuLabelDecorator();
        const menuLabel = this._mainLabelDecorator.getLabel('Skype');
        return new electron_1.MenuItem({
            label: menuLabel,
            submenu: [{
                    label: labelDecorator.getLabel(LanguageInit_1.language.getString('Menu.AboutSkypeLabel')),
                    enabled: this._isAuthenticated(),
                    click: () => {
                        this._emitMenuEvent('menu-about');
                    }
                },
                ...this._buildSeparator(),
                {
                    label: labelDecorator.getLabel(LanguageInit_1.language.getString('Menu.PreferencesLabel'), true),
                    accelerator: 'Command+,',
                    enabled: this._isAuthenticated() && !this._isGuestUser(),
                    click: () => {
                        this._emitMenuEvent('menu-open-settings');
                    }
                },
                {
                    label: labelDecorator.getLabel(LanguageInit_1.language.getString('Menu.AudioVideoSettingsLabel'), true),
                    enabled: this._isAuthenticated(),
                    click: () => {
                        this._emitMenuEvent('menu-open-av-settings');
                    }
                },
                ...this._buildSeparator(),
                {
                    label: labelDecorator.getLabel(LanguageInit_1.language.getString('Menu.CheckForUpdatesLabel')),
                    visible: this._updater.updatesEnabled(),
                    enabled: this._isAuthenticated(),
                    click: () => {
                        this._emitMenuEvent('menu-about');
                    }
                },
                ...this._buildSeparator(),
                {
                    label: labelDecorator.getLabel(LanguageInit_1.language.getString('Menu.ServicesLabel')),
                    role: 'services',
                    submenu: []
                },
                ...this._buildSeparator(),
                {
                    label: labelDecorator.getLabel(LanguageInit_1.language.getString('Menu.HideSkypeLabel')),
                    accelerator: 'Command+H',
                    role: 'hide'
                },
                {
                    label: labelDecorator.getLabel(LanguageInit_1.language.getString('Menu.HideOthersLabel')),
                    role: 'hideothers'
                },
                {
                    label: labelDecorator.getLabel(LanguageInit_1.language.getString('Menu.ShowAllLabel')),
                    role: 'unhide'
                },
                ...this._buildSeparator(),
                {
                    label: labelDecorator.getLabel(LanguageInit_1.language.getString('Menu.QuitSkypeLabel')),
                    accelerator: 'Command+Q',
                    click: () => {
                        this._application.quit();
                    }
                }]
        });
    }
    _buildFileMenuItem() {
        const labelDecorator = new MenuShortcutDecorator_1.MenuLabelDecorator();
        const menuLabel = this._mainLabelDecorator.getLabel(LanguageInit_1.language.getString('Menu.FileLabel'));
        return new electron_1.MenuItem({
            label: menuLabel,
            submenu: [{
                    label: labelDecorator.getLabel(LanguageInit_1.language.getString('Menu.NewGroupChatLabel'), true),
                    accelerator: 'CmdOrCtrl+G',
                    enabled: this._isAuthenticated() && !this._isGuestUser(),
                    click: () => {
                        this._emitMenuEvent('menu-new-group-chat');
                    }
                },
                {
                    label: labelDecorator.getLabel(LanguageInit_1.language.getString('Menu.New1on1ChatLabel'), true),
                    accelerator: 'CmdOrCtrl+N',
                    enabled: this._isAuthenticated() && !this._isGuestUser(),
                    click: () => {
                        this._emitMenuEvent('menu-new-1-1-chat');
                    }
                },
                {
                    label: labelDecorator.getLabel(LanguageInit_1.language.getString('Menu.NewCallLabel'), true),
                    enabled: this._isAuthenticated() && !this._isGuestUser(),
                    click: () => {
                        this._emitMenuEvent('menu-new-call');
                    }
                },
                ...this._buildSeparator(),
                {
                    label: labelDecorator.getLabel(LanguageInit_1.language.getString('Menu.ViewProfileLabel'), true),
                    enabled: this._isAuthenticated() && !this._isGuestUser(),
                    click: () => {
                        this._emitMenuEvent('menu-open-profile');
                    }
                },
                ...this._buildSeparator(),
                {
                    label: labelDecorator.getLabel(LanguageInit_1.language.getString('Menu.SignOutLabel')),
                    enabled: this._isAuthenticated(),
                    click: () => {
                        this._emitMenuEvent('menu-sign-out');
                    }
                },
                {
                    label: labelDecorator.getLabel(LanguageInit_1.language.getString('Menu.QuitLabel')),
                    visible: !Platform_1.isMac(),
                    accelerator: 'CmdOrCtrl+Q',
                    click: () => {
                        this._application.quit();
                    }
                }
            ]
        });
    }
    _buildEditMenuItem() {
        const labelDecorator = new MenuShortcutDecorator_1.MenuLabelDecorator();
        const menuLabel = this._mainLabelDecorator.getLabel(LanguageInit_1.language.getString('Menu.EditLabel'));
        const pasteAsPlainTextMenuItem = this._shouldHavePasteAsPlainTextOption
            ? [{
                    label: labelDecorator.getLabel(LanguageInit_1.language.getString('Menu.PastePlainLabel')),
                    accelerator: Platform_1.isMac() ? 'Cmd+Option+Shift+V' : 'Ctrl+Shift+V',
                    role: 'pasteandmatchstyle'
                }]
            : [];
        return new electron_1.MenuItem({
            label: menuLabel,
            submenu: [{
                    label: labelDecorator.getLabel(LanguageInit_1.language.getString('Menu.UndoLabel')),
                    accelerator: 'CmdOrCtrl+Z',
                    role: 'undo'
                },
                {
                    label: labelDecorator.getLabel(LanguageInit_1.language.getString('Menu.RedoLabel')),
                    accelerator: Platform_1.isMac() ? 'Command+Shift+Z' : 'CmdOrCtrl+Y',
                    role: 'redo'
                },
                ...this._buildSeparator(),
                {
                    label: labelDecorator.getLabel(LanguageInit_1.language.getString('Menu.CutLabel')),
                    accelerator: 'CmdOrCtrl+X',
                    role: 'cut'
                },
                {
                    label: labelDecorator.getLabel(LanguageInit_1.language.getString('Menu.CopyLabel')),
                    accelerator: 'CmdOrCtrl+C',
                    role: 'copy'
                },
                {
                    label: labelDecorator.getLabel(LanguageInit_1.language.getString('Menu.PasteLabel')),
                    accelerator: 'CmdOrCtrl+V',
                    role: 'paste'
                },
                ...pasteAsPlainTextMenuItem,
                {
                    label: labelDecorator.getLabel(LanguageInit_1.language.getString('Menu.SelectAllLabel')),
                    accelerator: 'CmdOrCtrl+A',
                    role: 'selectall'
                },
                ...this._buildSeparator(),
                {
                    label: labelDecorator.getLabel(LanguageInit_1.language.getString('Menu.SearchSkypeLabel'), true),
                    accelerator: Platform_1.isMac() ? 'Alt+Command+F' : 'Ctrl+Shift+S',
                    enabled: this._isAuthenticated(),
                    click: () => {
                        this._emitMenuEvent('menu-search-skype');
                    }
                }
            ]
        });
    }
    _buildViewMenuItem() {
        const labelDecorator = new MenuShortcutDecorator_1.MenuLabelDecorator();
        const menuLabel = this._mainLabelDecorator.getLabel(LanguageInit_1.language.getString('Menu.ViewLabel'));
        const conversationNavigationItems = !Platform_1.isMac() ? this._buildConversationNavigationMenuItemOptions() : [];
        return new electron_1.MenuItem({
            label: menuLabel,
            submenu: [{
                    label: labelDecorator.getLabel(LanguageInit_1.language.getString('Menu.ToggleFullScreenLabel')),
                    accelerator: Platform_1.isMac() ? 'Ctrl+Command+F' : 'F11',
                    click: (item, focusedWindow) => {
                        if (focusedWindow) {
                            focusedWindow.setFullScreen(!focusedWindow.isFullScreen());
                        }
                    }
                },
                ...this._buildSeparator(),
                {
                    label: labelDecorator.getLabel(LanguageInit_1.language.getString('Menu.ActualSizeLabel')),
                    accelerator: 'CmdOrCtrl+0',
                    click: () => {
                        this._emitMenuEvent('zoom-reset');
                    }
                },
                {
                    label: labelDecorator.getLabel(LanguageInit_1.language.getString('Menu.ZoomInLabel')),
                    accelerator: 'CmdOrCtrl+Plus',
                    click: () => {
                        this._emitMenuEvent('zoom-in');
                    }
                },
                {
                    label: labelDecorator.getLabel(LanguageInit_1.language.getString('Menu.ZoomOutLabel')),
                    accelerator: 'CmdOrCtrl+-',
                    click: () => {
                        this._emitMenuEvent('zoom-out');
                    }
                },
                ...conversationNavigationItems]
        });
    }
    _buildWindowMenuItem() {
        const labelDecorator = new MenuShortcutDecorator_1.MenuLabelDecorator();
        const menuLabel = this._mainLabelDecorator.getLabel(LanguageInit_1.language.getString('Menu.WindowLabel'));
        const conversationNavigationItems = Platform_1.isMac() ? this._buildConversationNavigationMenuItemOptions() : [];
        return new electron_1.MenuItem({
            label: menuLabel,
            role: 'window',
            submenu: [{
                    label: labelDecorator.getLabel(LanguageInit_1.language.getString('Menu.MinimizeLabel')),
                    accelerator: 'Command+M',
                    role: 'minimize'
                },
                {
                    label: labelDecorator.getLabel(LanguageInit_1.language.getString('Menu.CloseLabel')),
                    accelerator: 'Command+W',
                    role: 'close'
                },
                ...this._buildSeparator(),
                {
                    label: labelDecorator.getLabel(LanguageInit_1.language.getString('Menu.BringAllToFrontLabel')),
                    role: 'front'
                },
                ...conversationNavigationItems,
                ...this._buildSeparator(),
                {
                    label: labelDecorator.getLabel(LanguageInit_1.language.getString('Skype')),
                    accelerator: 'Command+1',
                    click: item => {
                        const mainWindow = this._application.getMainWindow();
                        if (mainWindow && mainWindow.hasValidWindow()) {
                            mainWindow.window.isVisible() ? mainWindow.window.hide() : mainWindow.window.show();
                        }
                    }
                }]
        });
    }
    _buildToolsMenuItem() {
        const labelDecorator = new MenuShortcutDecorator_1.MenuLabelDecorator();
        const menuLabel = this._mainLabelDecorator.getLabel(LanguageInit_1.language.getString('Menu.ToolsLabel'));
        const exporterMenuLabel = Platform_1.isLinux() ? 'Menu.ExportHistoryLinuxLabel' : 'Menu.ExportHistoryLabel';
        return new electron_1.MenuItem({
            label: menuLabel,
            submenu: [
                {
                    label: labelDecorator.getLabel(LanguageInit_1.language.getString('Menu.SettingsLabel'), true),
                    accelerator: 'Ctrl+,',
                    visible: !Platform_1.isMac(),
                    enabled: this._isAuthenticated(),
                    click: () => {
                        this._emitMenuEvent('menu-open-settings');
                    }
                },
                {
                    label: labelDecorator.getLabel(LanguageInit_1.language.getString('Menu.AudioVideoSettingsLabel'), true),
                    visible: !Platform_1.isMac(),
                    enabled: this._isAuthenticated(),
                    click: () => {
                        this._emitMenuEvent('menu-open-av-settings');
                    }
                },
                ...this._buildSeparator(!Platform_1.isMac()),
                {
                    label: labelDecorator.getLabel(LanguageInit_1.language.getString(exporterMenuLabel), true),
                    enabled: this._isAuthenticated(),
                    click: () => {
                        this._application.openHistoryExporter();
                    }
                }
            ]
        });
    }
    _buildHelpMenuItem() {
        const labelDecorator = new MenuShortcutDecorator_1.MenuLabelDecorator();
        const menuLabel = this._mainLabelDecorator.getLabel(LanguageInit_1.language.getString('Menu.HelpLabel'));
        return new electron_1.MenuItem({
            label: menuLabel,
            role: 'help',
            submenu: [
                {
                    label: labelDecorator.getLabel(LanguageInit_1.language.getString('Menu.LearnAboutSkypeLabel')),
                    click: () => {
                        electron_1.shell.openExternal(this._homeUrl);
                    }
                },
                {
                    label: labelDecorator.getLabel(LanguageInit_1.language.getString('Menu.GoToStatusLabel')),
                    click: () => {
                        if (this._isAuthenticated()) {
                            this._emitMenuEvent('menu-skype-status');
                        }
                        else {
                            electron_1.shell.openExternal(this._statusUrl);
                        }
                    }
                },
                {
                    label: labelDecorator.getLabel(LanguageInit_1.language.getString('Menu.GoToSupportLabel')),
                    click: () => {
                        if (this._isAuthenticated()) {
                            this._emitMenuEvent('menu-skype-support');
                        }
                        else {
                            electron_1.shell.openExternal(this._supportUrl);
                        }
                    }
                },
                {
                    label: labelDecorator.getLabel(LanguageInit_1.language.getString('Menu.AskTheSkypeCommunityLabel')),
                    click: () => {
                        electron_1.shell.openExternal(this._communityUrl);
                    }
                },
                ...this._buildSeparator(),
                {
                    label: labelDecorator.getLabel(LanguageInit_1.language.getString('Menu.ThirdPartyNoticesLabel')),
                    enabled: this._isAuthenticated(),
                    click: () => {
                        electron_1.shell.openItem(constants.thirdPartyNoticesFile);
                    }
                },
                {
                    label: labelDecorator.getLabel(LanguageInit_1.language.getString('Menu.PrivacyStatementLabel')),
                    enabled: this._isAuthenticated(),
                    click: () => {
                        this._emitMenuEvent('menu-privacy');
                    }
                },
                {
                    label: labelDecorator.getLabel(LanguageInit_1.language.getString('Menu.ServiceAgreementLabel')),
                    click: () => {
                        this._emitMenuEvent('menu-terms');
                    }
                },
                ...this._buildSeparator(!Platform_1.isMac()),
                {
                    label: labelDecorator.getLabel(LanguageInit_1.language.getString('Menu.AboutSkypeLabel')),
                    visible: !Platform_1.isMac(),
                    enabled: this._isAuthenticated(),
                    click: () => {
                        this._emitMenuEvent('menu-about');
                    }
                },
                ...this._buildSeparator(Platform_1.isWindows() && this._updater.updatesEnabled()),
                {
                    label: LanguageInit_1.language.getString('Menu.CheckForUpdatesLabel'),
                    visible: Platform_1.isWindows() && this._updater.updatesEnabled(),
                    enabled: this._isAuthenticated(),
                    click: () => {
                        this._emitMenuEvent('menu-about');
                    }
                },
                ...this._buildSeparator(),
                {
                    label: labelDecorator.getLabel(LanguageInit_1.language.getString('Menu.ReportProblemLabel'), true),
                    enabled: this._isAuthenticated(),
                    click: () => {
                        this._emitMenuEvent('menu-report-problem');
                    }
                }
            ]
        });
    }
    _buildDebugMenu() {
        const appDataDir = electron_1.app.getPath('userData');
        const logsPath = path.join(appDataDir, '/logs');
        const skypeUri = SkypeUri_1.getInstance();
        const labelDecorator = new MenuShortcutDecorator_1.MenuLabelDecorator();
        const menuLabel = this._mainLabelDecorator.getLabel(LanguageInit_1.language.getString('Menu.DebugLabel'));
        const TURN_ON_LOGGING = LanguageInit_1.language.getString('Menu.EnableLoggingLabel');
        const TURN_OFF_LOGGING = LanguageInit_1.language.getString('Menu.DisableLoggingLabel');
        return new electron_1.MenuItem({
            label: menuLabel,
            submenu: [
                {
                    label: labelDecorator.getLabel(LanguageInit_1.language.getString('Menu.UseForSkypeLinksLabel')),
                    type: 'checkbox',
                    checked: skypeUri.isRegistered(),
                    visible: !Platform_1.isLinux(),
                    click: item => {
                        skypeUri.setRegistered(item.checked);
                    }
                },
                {
                    label: labelDecorator.getLabel(LanguageInit_1.language.getString('Menu.ReloadLabel')),
                    accelerator: 'CmdOrCtrl+R',
                    type: 'normal',
                    click: (item, focusedWindow) => {
                        if (focusedWindow) {
                            this._environmentInfoProvider.setAppReloaded();
                            focusedWindow.reload();
                        }
                    }
                },
                {
                    label: labelDecorator.getLabel(LanguageInit_1.language.getString('Menu.ToggleDeveloperToolsLabel')),
                    type: 'normal',
                    accelerator: (Platform_1.isMac() ? 'Alt+Command+I' : 'Ctrl+Shift+I'),
                    click: (item, focusedWindow) => {
                        if (focusedWindow) {
                            focusedWindow.webContents.toggleDevTools();
                        }
                    }
                },
                {
                    label: labelDecorator.getLabel(this._logger.isLoggingEnabled() ? TURN_OFF_LOGGING : TURN_ON_LOGGING),
                    type: 'normal',
                    click: item => {
                        let dialogOptions;
                        const enableButtons = [
                            LanguageInit_1.language.getString('Dialogs.EnableLogCollection.YesButton'),
                            LanguageInit_1.language.getString('Dialogs.EnableLogCollection.NoButton')
                        ];
                        const disableButtons = [
                            LanguageInit_1.language.getString('Dialogs.DisableLogCollection.YesButton'),
                            LanguageInit_1.language.getString('Dialogs.DisableLogCollection.NoButton')
                        ];
                        if (this._logger.isLoggingEnabled()) {
                            dialogOptions = {
                                title: LanguageInit_1.language.getString('Dialogs.DisableLogCollection.Title'),
                                type: 'none',
                                icon: electron_1.nativeImage.createFromPath(path.join(constants.rootDir, 'images/Skype.png')),
                                message: LanguageInit_1.language.getString('Dialogs.DisableLogCollection.Message', { logsPath: logsPath }),
                                buttons: disableButtons,
                                cancelId: 1
                            };
                        }
                        else {
                            dialogOptions = {
                                title: LanguageInit_1.language.getString('Dialogs.DisableLogCollection.Title'),
                                type: 'none',
                                icon: electron_1.nativeImage.createFromPath(path.join(constants.rootDir, 'images/Skype.png')),
                                message: LanguageInit_1.language.getString('Dialogs.EnableLogCollection.Message', { logsPath: logsPath }),
                                buttons: enableButtons,
                                cancelId: 1
                            };
                        }
                        electron_1.dialog.showMessageBox(dialogOptions, cancel => {
                            this._logger.debug('[ApplicationMenu] Turning on logging dialog with result: ', cancel);
                            if (cancel) {
                                this._logger.debug('[ApplicationMenu] Turning on logging dialog with result: dialog canceled.');
                                return;
                            }
                            const newSetting = !this._logger.isLoggingEnabled();
                            this._logger.setLoggingEnabled(newSetting);
                            item.label = labelDecorator.getLabel(newSetting ? TURN_OFF_LOGGING : TURN_ON_LOGGING);
                            this._refreshMenu();
                        });
                    }
                }
            ]
        });
    }
    _buildConversationNavigationMenuItemOptions() {
        return this._shouldShowConversationNavigationItems ? [
            ...this._buildSeparator(),
            {
                label: LanguageInit_1.language.getString('Menu.NextConversationLabel'),
                accelerator: 'Ctrl+Tab',
                enabled: this._isAuthenticated(),
                click: () => {
                    this._emitMenuEvent('menu-next-conversation');
                }
            },
            {
                label: LanguageInit_1.language.getString('Menu.PreviousConversationLabel'),
                accelerator: 'Ctrl+Shift+Tab',
                enabled: this._isAuthenticated(),
                click: () => {
                    this._emitMenuEvent('menu-previous-conversation');
                }
            }
        ] : [];
    }
    setShowConversationNavigationItemsVisible(toggle) {
        if (this._shouldShowConversationNavigationItems === toggle) {
            return;
        }
        this._shouldShowConversationNavigationItems = toggle;
        this._refreshMenu();
    }
    setPasteAsPlainTextOption(value) {
        if (this._shouldHavePasteAsPlainTextOption === value) {
            return;
        }
        this._shouldHavePasteAsPlainTextOption = value;
        this._refreshMenu();
    }
    _emitMenuEvent(eventName) {
        electron_1.app.emit('menu-event', eventName);
    }
    _isAuthenticated() {
        return this._authStore.isAuthenticated();
    }
    _isGuestUser() {
        return this._authStore.isGuestUser();
    }
}
exports.ApplicationMenu = ApplicationMenu;
