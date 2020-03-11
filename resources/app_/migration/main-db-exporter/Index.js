"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const os = require("os");
const path = require("path");
const AccountExporter_1 = require("./AccountExporter");
const BatchHtmlExporter_1 = require("./BatchHtmlExporter");
const fileUtils = require("./FileUtils");
function fetchDefaultDbAccountsAsync() {
    const dbName = 'main.db';
    const defaultLocations = findDbFolders(dbName).map(folder => {
        return path.join(folder, dbName);
    });
    const exporter = new AccountExporter_1.AccountExporter(defaultLocations);
    return exporter.getAccountDetails();
}
exports.fetchDefaultDbAccountsAsync = fetchDefaultDbAccountsAsync;
function exportAccountsAsync(accounts, outputDir, progressReporter) {
    const batchExorter = new BatchHtmlExporter_1.BatchHtmlExporter(accounts, outputDir);
    if (progressReporter) {
        batchExorter.onProgress(progressReporter);
    }
    return batchExorter.export();
}
exports.exportAccountsAsync = exportAccountsAsync;
function findDbFolders(fileName, root) {
    if (!fileName) {
        throw Error('DB file name missing');
    }
    if (!root) {
        root = '.';
        if (fileUtils.isWindows()) {
            root = path.join(os.homedir(), 'AppData', 'Roaming', 'Skype');
        }
        else if (fileUtils.isMac()) {
            root = path.join(os.homedir(), 'Library', 'Application Support', 'Skype');
        }
        else if (fileUtils.isLinux()) {
            root = path.join(os.homedir(), '.Skype');
        }
    }
    const folders = fileUtils.findFile(root, fileName, 4);
    return folders;
}
exports.findDbFolders = findDbFolders;
