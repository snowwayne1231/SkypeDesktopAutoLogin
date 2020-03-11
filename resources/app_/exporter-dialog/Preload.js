"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const os = require("os");
const path = require("path");
const AuthStore_1 = require("../login/AuthStore");
const DomUtils_1 = require("../security/DomUtils");
const LanguageInit_1 = require("../localisation/LanguageInit");
const Logger_1 = require("../logger/Logger");
const Index_1 = require("../migration/main-db-exporter/Index");
const TARGET_EXPORT_DIR = 'skype-export';
const logger = Logger_1.getInstance();
const skypeId = AuthStore_1.getInstance().getUsername();
class ExporterApi {
    constructor(username) {
        this.username = username;
    }
    getOutputFolder() {
        return this._getDefaultOutputFolder();
    }
    openOutputFolder() {
        electron_1.remote.shell.showItemInFolder(path.join(this._getDefaultOutputFolder(), 'index.html'));
    }
    openInBrowser() {
        electron_1.remote.shell.openItem(path.join(this._getDefaultOutputFolder(), 'index.html'));
    }
    fetchDefaultDbAccounts() {
        return Index_1.fetchDefaultDbAccountsAsync();
    }
    exportAccounts(accounts, progressReporter) {
        return Index_1.exportAccountsAsync(accounts, this._getDefaultOutputFolder(), progressReporter);
    }
    _getDefaultOutputFolder() {
        return path.join(os.homedir(), TARGET_EXPORT_DIR);
    }
}
window['exporterApi'] = new ExporterApi(skypeId);
window['domLocaliser'] = LanguageInit_1.domLocaliser;
window['localisation'] = LanguageInit_1.language;
window['logger'] = logger;
DomUtils_1.disableDragAndDrop();
