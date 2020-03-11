"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = require("crypto");
const https = require("https");
const url = require("url");
const HttpsProxyAgent = require("https-proxy-agent");
class HttpsRequest {
    constructor(requestOptions, logger) {
        this.retryCountLimit = 3;
        this.retryCount = 0;
        this.timeout = 30 * 1000;
        this.retryIn = 0;
        this.options = requestOptions;
        this.logger = logger;
        this.httpsOptions = this._parseOptionsToHttpsOptions(requestOptions);
        this.proxy = HttpsRequest.getProxySettings();
        if (this.proxy) {
            this.agent = new HttpsProxyAgent(this.proxy);
            this.httpsOptions.agent = this.agent;
        }
        if (requestOptions.timeout) {
            this.timeout = requestOptions.timeout;
        }
        if (requestOptions.retryCountLimit) {
            this.retryCountLimit = requestOptions.retryCountLimit;
        }
        if (requestOptions.retryIn) {
            this.retryIn = requestOptions.retryIn;
        }
        this.requestId = crypto.randomBytes(3).toString('hex');
    }
    send() {
        return new Promise((resolve, reject) => {
            this._makeRequest(response => {
                resolve(response);
            }, err => {
                reject(err);
            });
        });
    }
    _makeRequest(successCallback, errorCallback) {
        this.retryCount++;
        let statsStart = Date.now();
        let gotResponse = false;
        this.logger.info(`[HttpsRequest] [${this.requestId}] Sending request to ${this.httpsOptions.method} ${this.options.url}, `
            + `Proxy: ${this.proxy ? true : false}, Attempt: ${this.retryCount}/${this.retryCountLimit}`);
        const req = https.request(this.httpsOptions, httpsResponse => {
            let resbody = '';
            httpsResponse.on('data', (chunk) => {
                resbody += chunk;
            });
            httpsResponse.on('end', () => {
                if (gotResponse) {
                    return;
                }
                gotResponse = true;
                if (this.options.retryOnStatus && (this.options.retryOnStatus.indexOf(httpsResponse.statusCode) !== -1)) {
                    if (this.retryCount < this.retryCountLimit) {
                        let retryTime = this.retryIn * this.retryCount;
                        this.logger.info(`[HttpsRequest] [${this.requestId}] ` +
                            `Got HTTP status code ${httpsResponse.statusCode} which requires retry. ` +
                            `${this._getRequestStat(statsStart)}. Retrying in ${retryTime}s.`);
                        setTimeout(() => { this._makeRequest(successCallback, errorCallback); }, (retryTime * 1000));
                    }
                    else {
                        this.logger.info(`[HttpsRequest] [${this.requestId}] ` +
                            `Got response: [${httpsResponse.statusCode}] ${httpsResponse.statusMessage}. ` +
                            `${this._getRequestStat(statsStart)}`);
                        successCallback({
                            headers: httpsResponse.headers,
                            body: resbody,
                            statusCode: httpsResponse.statusCode,
                            statusMessage: httpsResponse.statusMessage
                        });
                    }
                }
                else {
                    this.logger.info(`[HttpsRequest] [${this.requestId}] ` +
                        `Got response: [${httpsResponse.statusCode}] ${httpsResponse.statusMessage}. ` +
                        `${this._getRequestStat(statsStart)}`);
                    successCallback({
                        headers: httpsResponse.headers,
                        body: resbody,
                        statusCode: httpsResponse.statusCode,
                        statusMessage: httpsResponse.statusMessage
                    });
                }
            });
        });
        req.on('error', (err) => {
            if (gotResponse) {
                return;
            }
            gotResponse = true;
            let isRetry = this.retryCount < this.retryCountLimit;
            let retryTime = this.retryIn * this.retryCount;
            let retryText = isRetry ? `Retrying in ${retryTime}s.` : 'No retry.';
            this.logger.warn(`[HttpsRequest] [${this.requestId}] Request failed with error: ${err.message}. ` +
                `${this._getRequestStat(statsStart)}. ${retryText}`);
            if (isRetry) {
                setTimeout(() => { this._makeRequest(successCallback, errorCallback); }, (retryTime * 1000));
            }
            else {
                errorCallback(err);
            }
        });
        req.setTimeout(this.timeout, () => {
            if (gotResponse) {
                return;
            }
            gotResponse = true;
            req.abort();
            let isRetry = this.retryCount < this.retryCountLimit;
            let retryTime = this.retryIn * this.retryCount;
            let retryText = isRetry ? `Retrying in ${retryTime}s.` : 'No retry.';
            this.logger.warn(`[HttpsRequest] [${this.requestId}] Request timed out after ${this.timeout / 1000}s. ${retryText}`);
            if (isRetry) {
                setTimeout(() => { this._makeRequest(successCallback, errorCallback); }, (retryTime * 1000));
            }
            else {
                errorCallback(new Error('timeout'));
            }
        });
        if (this.options.body) {
            req.write(this.options.body);
        }
        req.end();
    }
    _getRequestStat(statsStart) {
        let duration = Date.now() - statsStart;
        return `Duration: ${duration}ms`;
    }
    static getProxySettings() {
        let proxyString = process.env.https_proxy || process.env.HTTPS_PROXY || undefined;
        if (proxyString && !/^https?:\/\//i.test(proxyString)) {
            proxyString = `https://${proxyString}`;
        }
        return proxyString;
    }
    _parseOptionsToHttpsOptions(requestOptions) {
        const parsedUri = url.parse(requestOptions.url);
        const secure = parsedUri.protocol ? /^https:?$/i.test(parsedUri.protocol) : false;
        const portNumber = parsedUri.port ? parseInt(parsedUri.port, 10) : (secure ? 443 : 80);
        let httpsOptions = {
            protocol: parsedUri.protocol,
            hostname: parsedUri.hostname,
            port: portNumber,
            method: requestOptions.method,
            path: parsedUri.path,
            headers: requestOptions.headers
        };
        if (requestOptions.body && !(httpsOptions.headers && httpsOptions.headers['Content-Length'])) {
            if (!httpsOptions.headers) {
                httpsOptions.headers = {};
            }
            httpsOptions.headers['Content-Length'] = this._calculateContentLength(requestOptions.body);
        }
        return httpsOptions;
    }
    _calculateContentLength(content) {
        return content.length;
    }
}
exports.HttpsRequest = HttpsRequest;
