"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron = require("electron");
const fs = require("fs");
const path = require("path");
const Registry = require("winreg");
const xmldom_1 = require("xmldom");
const Logger_1 = require("../logger/Logger");
const Platform_1 = require("../tools/Platform");
const Settings_1 = require("../Settings");
const UsernameTools_1 = require("./UsernameTools");
const app = (electron.app || electron.remote.app);
const slimcoreLogPath = path.join(app.getPath('userData'), 'skylib');
const configName = 'config.xml';
const sharedName = 'shared.xml';
class T1SettingsMigrator {
    constructor() {
        this._logger = Logger_1.getInstance();
    }
    runMigration(username) {
        const keyRoot = `migrations.${UsernameTools_1.hashSkypeName(username)}`;
        const hashKey = (subKey) => `${keyRoot}.${subKey}`;
        const notSet = (key) => !Settings_1.settings.get(hashKey(key));
        const keysToMigrate = T1SettingsMigrator.T1Keys.filter(notSet);
        if (!keysToMigrate.length) {
            this._logger.info('[T1SettingsMigrator] Migration: no keys need to be migrated');
            return Promise.resolve(undefined);
        }
        return new Promise((resolve, reject) => {
            this._getT1Settings(username).then(t1Settings => {
                if (!t1Settings) {
                    resolve(undefined);
                    return;
                }
                const copyFrom = (copySettings) => (obj, key) => (obj[key] = copySettings[key], obj);
                const onlyMigratedSettings = keysToMigrate.reduce(copyFrom(t1Settings), { username });
                resolve(onlyMigratedSettings);
            }, err => {
                this._logger.error('[T1SettingsMigrator] Migration: failed with error', err);
                resolve(undefined);
            });
        });
    }
    markMigrated(migratedSettings) {
        if (migratedSettings) {
            const keyRoot = `migrations.${UsernameTools_1.hashSkypeName(migratedSettings.username)}`;
            const hashKey = (subKey) => `${keyRoot}.${subKey}`;
            const migratedKeys = Object.keys(migratedSettings).filter(k => k !== 'username');
            migratedKeys.map(hashKey).forEach(k => Settings_1.settings.set(k, true));
            this._logger.info(`[T1SettingsMigrator] Migration: migrated ${migratedKeys.join(',')} keys`);
        }
    }
    _getT1Settings(username) {
        return new Promise((resolve, reject) => {
            const configPath = path.join(slimcoreLogPath, UsernameTools_1.escapeUsername(username), configName);
            const sharedPath = path.join(slimcoreLogPath, sharedName);
            if (!fs.existsSync(configPath) || !fs.existsSync(sharedPath)) {
                this._logger.info('[T1SettingsMigrator] Migration: T1 settings unavailable');
                resolve(undefined);
                return;
            }
            const config = T1SettingsMigrator._readXMLFile(configPath);
            const shared = T1SettingsMigrator._readXMLFile(sharedPath);
            this._getEnableChatNotifications(username).then(enableChatNotifications => {
                resolve({
                    username,
                    autoAnswerCalls: T1SettingsMigrator._getBoolValue(config, 'config/UI/Calls/FriendsAutoAnswer'),
                    autoAnswerCallsWithVideo: Platform_1.isMac() ?
                        !T1SettingsMigrator._getBoolValue(config, 'config/UI/Calls/AutoAnswerWithAudioOnly') :
                        T1SettingsMigrator._getBoolValue(config, 'config/UI/Calls/AutoStartVideo'),
                    enableChatNotifications: enableChatNotifications,
                    agcEnabled: T1SettingsMigrator._getBoolValue(shared, 'config/Lib/VoiceEng/AGC'),
                    cameraId: T1SettingsMigrator._getStringValue(config, 'config/Lib/Video/DevicePath'),
                    microphoneName: Platform_1.isWindows() ?
                        T1SettingsMigrator._getStringValue(shared, 'config/UI/Devices/InputName') :
                        undefined,
                    speakerName: Platform_1.isWindows() ?
                        T1SettingsMigrator._getStringValue(shared, 'config/UI/Devices/OutputName') :
                        undefined,
                    disableCallMonitor: T1SettingsMigrator._getBoolValue(config, 'config/UI/Calls/DisableAutoCallMonitor'),
                    displayUrlPreviewsEnabled: T1SettingsMigrator._getBoolValue(config, 'config/UI/Chat/ShowInlineLinks'),
                    emergencyCallDefaultCountry: T1SettingsMigrator._getStringValue(config, 'config/Lib/Call/EmergencyCountry'),
                    showLargeEmoticons: T1SettingsMigrator._getBoolValue(config, 'config/UI/General/ShowLargeEmoticons'),
                    sendMessageWithEnter: T1SettingsMigrator._getSettingSendMessageWithEnter(config),
                    useCondensedListView: T1SettingsMigrator._getBoolValue(config, 'config/UI/General/UseCondensedListView'),
                });
            });
        });
    }
    _getEnableChatNotifications(username) {
        return new Promise((resolve, reject) => {
            if (!Platform_1.isWindows()) {
                resolve(undefined);
                return;
            }
            const registry = new Registry({
                hive: Registry.HKCU,
                key: '\\Software\\skype\\Phone\\Users\\' + username
            });
            const name = 'IncomingCallNotificationsEnabled';
            try {
                registry.get(name, (err, result) => {
                    if (err) {
                        this._logger.error(`[T1SettingsMigrator] Error reading registry key ${registry.key} and name ${name}`, err);
                        resolve(undefined);
                    }
                    else {
                        this._logger.info(`[T1SettingsMigrator] Reading registry key ${registry.key} and name ${name}`, result);
                        resolve(result.value === '0x1');
                    }
                });
            }
            catch (ignore) {
                this._logger.error('[T1SettingsMigrator] Error while reading registry key registry.get()');
                resolve(undefined);
            }
        });
    }
    static _getStringValue(doc, path) {
        const element = T1SettingsMigrator._findNode(doc, path);
        return element && element.textContent || undefined;
    }
    static _getBoolValue(doc, path) {
        const value = T1SettingsMigrator._getStringValue(doc, path);
        return value === undefined ? undefined : value === '1';
    }
    static _findNode(node, searchPath) {
        return searchPath
            .split('/')
            .map(tag => node => node.tagName === tag)
            .reduce((lastNode, matcher) => {
            return lastNode && Array.prototype.find.call(lastNode.childNodes, matcher);
        }, node);
    }
    static _readXMLFile(path) {
        const rawXML = fs.readFileSync(path, { encoding: 'utf-8' });
        return new xmldom_1.DOMParser().parseFromString(rawXML, 'text/xml');
    }
    static _getSettingSendMessageWithEnter(config) {
        let sendWithCtrlEnter = T1SettingsMigrator._getBoolValue(config, 'config/UI/Chat/CtrlEnterSendMessage');
        return (sendWithCtrlEnter === undefined) || !sendWithCtrlEnter;
    }
}
T1SettingsMigrator.T1Keys = [
    'autoAnswerCalls',
    'autoAnswerCallsWithVideo',
    'enableChatNotifications',
    'agcEnabled',
    'cameraId',
    'microphoneName',
    'speakerName',
    'disableCallMonitor',
    'displayUrlPreviewsEnabled',
    'emergencyCallDefaultCountry',
    'showLargeEmoticons',
    'sendMessageWithEnter',
    'useCondensedListView',
];
exports.T1SettingsMigrator = T1SettingsMigrator;
