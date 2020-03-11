"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const events_1 = require("events");
const fs = require("fs");
const path = require("path");
const constants = require("../Constants");
const HttpsRequest_1 = require("../HttpsRequest");
const PackageInfo_1 = require("../configuration/PackageInfo");
class EcsConfig extends events_1.EventEmitter {
    constructor(ecsHost, logger, clientVersion, deviceInfo) {
        super();
        this._ecsCacheFile = path.join(electron_1.app.getPath('userData'), 'ecscache.json');
        this._ecsPath = constants.ecsPath;
        this._firstRun = true;
        this._retryCountLimit = 3;
        this._retryCount = 0;
        this._hostUrlIndex = 0;
        this._ecsHost = ecsHost.split(',');
        this._logger = logger;
        this._clientVersion = clientVersion;
        this._deviceInfo = deviceInfo;
    }
    start() {
        this.refreshEcsConfig();
    }
    getData() {
        return this._ecsData;
    }
    hasData() {
        return this._ecsData !== undefined;
    }
    stopTimers() {
        clearTimeout(this._refreshTimer);
        clearTimeout(this._retryTimer);
    }
    refreshEcsConfig() {
        this.stopTimers();
        this._firstRun = !this.hasData();
        this._getEcsConfig()
            .then(data => {
            if (data) {
                this._ecsData = data;
                this._cacheDataToFile();
                this.emit('ecs-data-changed');
            }
            else {
                this.emit('ecs-data-unchanged');
            }
            this._retryCount = 0;
            if (this._firstRun) {
                this.emit('ecs-data-ready');
            }
            this._refreshTimer = setTimeout(() => {
                this.emit('ecs-data-refresh');
                this.refreshEcsConfig();
            }, EcsConfig.refreshInterval);
        })
            .catch(message => {
            if (this._retryCount >= this._retryCountLimit) {
                let logMessage = `[EcsConfig] ${message} (Retry Count Limit Exceeded: ${this._retryCount++})`;
                if (!this.hasData()) {
                    this._loadCachedDataFromFile();
                    if (this.hasData() && this._firstRun) {
                        this._logger.warn(logMessage);
                        this._logger.warn('[EcsConfig] ECS config loaded from cache file');
                        this.emit('ecs-data-ready');
                    }
                    else {
                        this._logger.error(logMessage);
                        this.emit('ecs-data-error');
                    }
                }
                else {
                    this._logger.warn(logMessage);
                    this.emit('ecs-data-fail');
                }
            }
            else {
                this._logger.warn(`[EcsConfig] ${message} (Retry Count: ${this._retryCount++})`);
                this._retryTimer = setTimeout(() => {
                    this.emit('ecs-data-retry');
                    this.refreshEcsConfig();
                }, EcsConfig.retryFailedIn);
            }
        });
    }
    _cacheDataToFile() {
        try {
            let cache = {
                version: this._clientVersion.getVersion(),
                data: this._ecsData
            };
            let json = JSON.stringify(cache);
            fs.writeFileSync(this._ecsCacheFile, json);
        }
        catch (error) {
            this._logger.warn(`[EcsConfig] Error writing ecs cache: ${error.message}`);
        }
    }
    _loadCachedDataFromFile() {
        let stats;
        try {
            stats = fs.lstatSync(this._ecsCacheFile);
        }
        catch (error) {
            this._logger.info('[EcsConfig] Ecs cache does not exist.');
            return;
        }
        try {
            if (stats && stats.isFile()) {
                let json = fs.readFileSync(this._ecsCacheFile, 'utf8');
                let dataObject = JSON.parse(json);
                if (dataObject.version === this._clientVersion.getVersion()) {
                    this._ecsData = dataObject.data;
                }
                else {
                    fs.unlinkSync(this._ecsCacheFile);
                }
            }
        }
        catch (error) {
            this._logger.warn(`[EcsConfig] Error reading settings: ${error.message}`);
        }
    }
    _getEcsConfig() {
        this._logger.info('[EcsConfig] Downloading ECS Config');
        let ecsHost = this._ecsHost[this._hostUrlIndex++ % this._ecsHost.length].trim();
        let path = this._ecsPath
            .replace('#CONFIG_OPTION#', PackageInfo_1.readPackageJson().getData().buildChannel)
            .replace('#PLATFORM#', this._clientVersion.getPlatform())
            .replace('#VERSION#', this._clientVersion.getVersion())
            .replace('#CLIENT_ID#', this._deviceInfo.getId() || '');
        let ecsUrl = `https://${ecsHost}${path}`;
        let ecsHeaders = {
            'Accept': 'application/json;ver=1.0',
            'Content-Type': 'application/json'
        };
        if (this._ecsData) {
            ecsHeaders['If-None-Match'] = this._ecsData.etag;
        }
        let ecsPromise = new Promise((resolve, reject) => {
            let ecsRequest = new HttpsRequest_1.HttpsRequest({
                method: 'GET',
                url: ecsUrl,
                headers: ecsHeaders,
                retryCountLimit: 1
            }, this._logger);
            ecsRequest.send().then(res => {
                if (res.statusCode === 200) {
                    this._logger.info('[EcsConfig] ECS Config successfully downloaded.');
                    let result = JSON.parse(res.body);
                    resolve({
                        etag: result.Headers.ETag,
                        expires: new Date(result.Headers.Expires),
                        appDisabled: result.SkypeElectronWrapper.appDisabled || false,
                        platformUpdaterFeedUrl: result.SkypeElectronWrapper.platformUpdaterFeedUrl,
                        updateInterval: result.SkypeElectronWrapper.updateInterval
                            ? parseInt('' + result.SkypeElectronWrapper.updateInterval, 10)
                            : undefined,
                        lastVersionAvailable: result.SkypeElectronWrapper.lastVersionAvailable || '',
                        idleSystemTimeWindow: result.SkypeElectronWrapper.idleSystemTimeWindow
                            ? parseInt('' + result.SkypeElectronWrapper.idleSystemTimeWindow, 10)
                            : 0,
                        enableNonAdminDetection: result.SkypeElectronWrapper.enableNonAdminDetection || false
                    });
                }
                else if (res.statusCode === 304) {
                    this._logger.info('[EcsConfig] ECS Config not changed.');
                    resolve(undefined);
                }
                else {
                    reject(`ECS Config download failed with code: ${res.statusCode}`);
                }
            }).catch((err) => {
                reject(err);
            });
        });
        return ecsPromise;
    }
}
EcsConfig.retryGetIn = constants.ecsRetryGetIn;
EcsConfig.retryFailedIn = constants.ecsRetryFailedIn;
EcsConfig.refreshInterval = constants.ecsRefreshInterval;
exports.EcsConfig = EcsConfig;
