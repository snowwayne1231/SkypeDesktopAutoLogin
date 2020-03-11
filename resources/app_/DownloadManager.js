"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = require("crypto");
const electron = require("electron");
const fs = require("fs");
const path = require("path");
const constants = require("./Constants");
class DownloadManager {
    constructor(downloader) {
        this.DOWNLOADS_FOLDER_PATH = electron.app.getPath('downloads') || path.join(constants.appDataDir, 'Downloads');
        this.TEMP_FOLDER_PATH = electron.app.getPath('temp') || path.join(constants.appDataDir, 'temp');
        this._downloader = downloader;
    }
    getFromUrlWithProgressUpdate(fileUrl, downloadToPublicFolder, targetFilename, headers, quarantineDownloadedFile) {
        let filename;
        let shouldKeepOriginalFile = true;
        if (downloadToPublicFolder) {
            if (path.isAbsolute(targetFilename)) {
                shouldKeepOriginalFile = false;
                filename = targetFilename;
            }
            else {
                filename = this._getUniqueFullPath(targetFilename);
            }
        }
        else {
            const hash = crypto.createHmac('sha256', 'file_storage')
                .update(fileUrl)
                .digest('hex');
            filename = path.join(this.TEMP_FOLDER_PATH, `${hash}${path.extname(targetFilename)}`);
        }
        return this._downloader.getFromUrl(fileUrl, filename, headers, shouldKeepOriginalFile, !!quarantineDownloadedFile);
    }
    _getUniqueFullPath(originalFileName) {
        let fileNameWithoutExtension = '';
        let extension = '';
        if (originalFileName.startsWith('.')) {
            fileNameWithoutExtension = originalFileName;
        }
        else {
            let fileSplit = originalFileName.split('.');
            extension = (fileSplit.length > 1) ? '.' + fileSplit.pop() : '';
            fileNameWithoutExtension = fileSplit.join('.');
        }
        let duplicateNumber = 0;
        let fullPath;
        do {
            let duplicateNumberString = duplicateNumber === 0 ? '' : ` (${duplicateNumber})`;
            let fullFileName = `${fileNameWithoutExtension}${duplicateNumberString}${extension}`;
            fullPath = path.join(this.DOWNLOADS_FOLDER_PATH, fullFileName);
            duplicateNumber++;
        } while (fs.existsSync(fullPath));
        return fullPath;
    }
    openFile(fileUri) {
        return electron.shell.openItem(fileUri);
    }
    openFileLocation(fileUri) {
        return electron.shell.showItemInFolder(path.normalize(fileUri));
    }
    openFolderLocation(folderUri) {
        return this.openFile(folderUri);
    }
    getFileDownloadPath() {
        return this.DOWNLOADS_FOLDER_PATH;
    }
    openFileDownloadFolder() {
        this.openFileLocation(this.DOWNLOADS_FOLDER_PATH);
    }
    getFileStats(fileUri) {
        return new Promise((resolve, reject) => {
            fs.stat(fileUri, (err, stats) => {
                if (err) {
                    return reject(err);
                }
                resolve({
                    fileSizeInBytes: stats.size,
                    lastUpdatedTime: stats.mtime.getTime()
                });
            });
        });
    }
    showSaveDialog(options, callback) {
        electron.dialog.showSaveDialog(options, filename => {
            let normalizedFilename = filename;
            if (normalizedFilename) {
                const newExtension = path.extname(normalizedFilename);
                const originalExtension = options.defaultPath ? path.extname(options.defaultPath) : '';
                if ((newExtension.length === 0 && originalExtension.length !== 0) || newExtension !== originalExtension) {
                    normalizedFilename += originalExtension;
                }
                callback(normalizedFilename);
            }
        });
    }
    fileExists(fileUri) {
        return new Promise((resolve, reject) => {
            fs.access(fileUri, err => {
                if (err && err.code === 'ENOENT') {
                    resolve(false);
                }
                else if (err) {
                    reject(err);
                }
                else {
                    resolve(true);
                }
            });
        });
    }
    abort(fileUri) {
        return this._downloader.abort(fileUri);
    }
}
exports.DownloadManager = DownloadManager;
function getInstance() {
    if (electron.remote) {
        return electron.remote.require(__dirname + '/DownloadManager').downloadManager;
    }
    else {
        return exports.downloadManager;
    }
}
exports.getInstance = getInstance;
function init(downloader) {
    exports.downloadManager = new DownloadManager(downloader);
}
exports.init = init;
