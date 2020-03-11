"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron = require("electron");
const events_1 = require("events");
const fs = require("fs");
const https = require("https");
const path = require("path");
const url = require("url");
const zlib = require("zlib");
const File_1 = require("./tools/File");
const HttpsRequest_1 = require("./HttpsRequest");
const Platform_1 = require("./tools/Platform");
const HttpsProxyAgent = require("https-proxy-agent");
class Downloader {
    constructor(logger) {
        this._requests = {};
        this._logger = logger;
    }
    getFromUrl(fileUrl, targetFilename, headers, skipIfTargetExists = false, quarantineDownloadedFile = false) {
        this._logger.info(`[Downloader] GET file: ${fileUrl} to target: ${targetFilename}`);
        if (this._requests[fileUrl]) {
            return this._requests[fileUrl].progressEmitter;
        }
        const progressEmitter = new events_1.EventEmitter();
        if (skipIfTargetExists && fs.existsSync(targetFilename)) {
            setTimeout(() => {
                progressEmitter.emit('finished', {
                    statusCode: 304,
                    body: {
                        path: targetFilename
                    }
                });
            }, 200);
            return progressEmitter;
        }
        const timeoutValue = 2 * 60 * 1000;
        let logger = this._logger;
        let requestOptions = url.parse(fileUrl);
        requestOptions.headers = headers;
        let proxy = HttpsRequest_1.HttpsRequest.getProxySettings();
        if (proxy) {
            requestOptions.agent = new HttpsProxyAgent(proxy);
        }
        requestOptions.timeout = timeoutValue;
        let request = https.get(requestOptions);
        let aborted = false;
        this._requests[fileUrl] = { targetFilename, request, progressEmitter, aborted };
        request.on('response', (res) => {
            if (res.statusCode !== 200) {
                let error = new Error(`Fetch failed with code: ${res.statusCode}`);
                this._handleErrorOrTimeout(error, progressEmitter, fileUrl, res);
                return;
            }
            let resultStream;
            try {
                File_1.ensureDir(path.dirname(targetFilename));
                resultStream = fs.createWriteStream(targetFilename);
                resultStream.on('error', (error) => {
                    this._handleErrorOrTimeout(error, progressEmitter, fileUrl, res);
                    resultStream.end();
                });
            }
            catch (e) {
                let error = new Error(`Failed to create file on local system.`);
                this._handleErrorOrTimeout(error, progressEmitter, fileUrl, res);
                return;
            }
            const progressReportingGranularity = 1;
            let length = parseInt(res.headers['content-length'] ? '' + res.headers['content-length'] : '0', 10);
            let alreadyDownloaded = 0;
            let lastKnownProgressPercentage = 0;
            res.on('data', (chunk) => {
                alreadyDownloaded += chunk.length;
                let percentage = Math.floor(alreadyDownloaded / length * 100);
                if (percentage >= lastKnownProgressPercentage + progressReportingGranularity) {
                    lastKnownProgressPercentage = percentage;
                    progressEmitter.emit('progress', percentage);
                }
            });
            res.on('error', error => {
                this._handleErrorOrTimeout(error, progressEmitter, fileUrl, res);
            });
            let pipedStream;
            switch (res.headers['content-encoding']) {
                case 'gzip':
                    logger.info('[Downloader] Gzip compression.');
                    pipedStream = res.pipe(zlib.createGunzip()).pipe(resultStream);
                    break;
                case 'deflate':
                    logger.info('[Downloader] Deflate compression.');
                    pipedStream = res.pipe(zlib.createInflate()).pipe(resultStream);
                    break;
                default:
                    logger.info('[Downloader] No compression');
                    pipedStream = res.pipe(resultStream);
                    break;
            }
            pipedStream.on('finish', () => {
                if (alreadyDownloaded === length) {
                    if (quarantineDownloadedFile && Platform_1.isMac()) {
                        const isFileQuarantined = this._addQuarantineFlag(targetFilename);
                        if (!isFileQuarantined) {
                            let error = new Error('Unable to set quarantine flag.');
                            this._handleErrorOrTimeout(error, progressEmitter, fileUrl, res);
                            return;
                        }
                    }
                    logger.info(`[Downloader] Download of ${fileUrl} finished`);
                    progressEmitter.emit('finished', {
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: {
                            path: targetFilename
                        }
                    });
                    delete this._requests[fileUrl];
                }
                else {
                    let error = new Error('File download incomplete');
                    this._handleErrorOrTimeout(error, progressEmitter, fileUrl, res);
                }
            });
            pipedStream.on('close', () => {
                if (this._requests[fileUrl] && !this._requests[fileUrl].aborted) {
                    let error = new Error('Closed Connection');
                    this._handleErrorOrTimeout(error, progressEmitter, fileUrl, undefined);
                }
            });
        });
        request.on('error', error => {
            this._handleErrorOrTimeout(error, progressEmitter, fileUrl, undefined);
        });
        request.on('timeout', () => {
            let error = new Error('Timeout');
            if (this._requests[fileUrl]) {
                this._requests[fileUrl].aborted = true;
                request.abort();
            }
            this._handleErrorOrTimeout(error, progressEmitter, fileUrl, undefined);
        });
        request.on('aborted', () => {
            delete this._requests[fileUrl];
        });
        return progressEmitter;
    }
    abort(fileUrl) {
        this._logger.info(`[Downloader] Aborting request from ${fileUrl}.`);
        const downloadInfo = this._requests[fileUrl];
        if (!downloadInfo) {
            return false;
        }
        downloadInfo.aborted = true;
        downloadInfo.request.abort();
        this._clearDownload(fileUrl);
        return true;
    }
    _clearDownload(fileUrl) {
        const downloadInfo = this._requests[fileUrl];
        if (!downloadInfo) {
            return;
        }
        fs.stat(downloadInfo.targetFilename, (err, stats) => {
            if (!err && stats && stats.isFile()) {
                fs.unlink(downloadInfo.targetFilename, err => {
                    if (err) {
                        this._logger.error('[Downloader] Failed to delete the file.');
                    }
                });
            }
        });
        delete this._requests[fileUrl];
    }
    _handleErrorOrTimeout(error, progressEmitter, fileUrl, res) {
        this._logger.error(`[Downloader] Problem with response: ${error.message}`);
        const errorEvent = {
            statusCode: (res && res.statusCode) || 0,
            error: error.message,
            headers: res ? res.headers : undefined,
        };
        progressEmitter.emit('failed', errorEvent);
        this._clearDownload(fileUrl);
    }
    _addQuarantineFlag(filePath) {
        this._logger.info(`[Downloader] Setting quarantine flag.`);
        this._loadElectronUtilityModule();
        if (!this._electronUtility) {
            return false;
        }
        try {
            return this._electronUtility.setQuarantineFlag(filePath);
        }
        catch (error) {
            this._logger.error('[Downloader] Getting utility failed. Error: ', error);
            return false;
        }
    }
    _loadElectronUtilityModule() {
        if (!this._electronUtility) {
            try {
                this._electronUtility = require('electron-utility');
            }
            catch (error) {
                this._logger.error('[Downloader] Initializing electron-utility module failed. Error: ', error);
            }
        }
    }
}
exports.Downloader = Downloader;
function getInstance() {
    if (electron.remote) {
        return electron.remote.require(__dirname + '/Downloader').downloader;
    }
    else {
        return exports.downloader;
    }
}
exports.getInstance = getInstance;
function init(logger) {
    exports.downloader = new Downloader(logger);
}
exports.init = init;
