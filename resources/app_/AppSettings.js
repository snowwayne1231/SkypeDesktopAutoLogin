"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron = require("electron");
const events_1 = require("events");
const Settings_1 = require("./Settings");
class AppSettings extends events_1.EventEmitter {
    get() {
        let appSettings = {};
        appSettings.autoStartEnabled = Settings_1.settings.get(Settings_1.SettingsKeys.AutoStartEnabled, true);
        appSettings.onCloseKeepRunning = Settings_1.settings.get(Settings_1.SettingsKeys.OnCloseKeepRunning, true);
        appSettings.launchMinimized = Settings_1.settings.get(Settings_1.SettingsKeys.LaunchMinimized, false);
        appSettings.upgradedFromDelphi = Settings_1.settings.get(Settings_1.SettingsKeys.UpgradedFromDelphi, false);
        appSettings.upgradedFromDelphiDate = Settings_1.settings.get(Settings_1.SettingsKeys.UpgradedFromDelphiDate, undefined);
        return appSettings;
    }
    change(appSettingsDelta) {
        if (appSettingsDelta.autoStartEnabled !== undefined) {
            Settings_1.settings.set(Settings_1.SettingsKeys.AutoStartEnabled, appSettingsDelta.autoStartEnabled);
        }
        if (appSettingsDelta.onCloseKeepRunning !== undefined) {
            Settings_1.settings.set(Settings_1.SettingsKeys.OnCloseKeepRunning, appSettingsDelta.onCloseKeepRunning);
        }
        if (appSettingsDelta.launchMinimized !== undefined) {
            Settings_1.settings.set(Settings_1.SettingsKeys.LaunchMinimized, appSettingsDelta.launchMinimized);
        }
        this.emit('app-settings-changed');
    }
}
exports.AppSettings = AppSettings;
if (electron.remote) {
    exports.appSettings = electron.remote.require(__dirname + '/AppSettings').appSettings;
}
else {
    exports.appSettings = new AppSettings();
}
