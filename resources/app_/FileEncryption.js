"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = require("crypto");
const electron = require("electron");
const fs = require("fs");
const _ = require("lodash");
const path = require("path");
const Logger_1 = require("./logger/Logger");
const logger = Logger_1.getInstance();
const AES_KEY_SIZE = 32;
const AES_IV_SIZE = 16;
const AUTH_KEY_SIZE = 32;
class ElectronFileEncryption {
    constructor() {
        this._defaultAlgo = 'AES/CBC/PKCS7Padding';
    }
    getDefaultAlgo() {
        return this._defaultAlgo;
    }
    encryptFile(inPath, outPath, algo, iv, key, authkey) {
        if (algo !== this._defaultAlgo) {
            return Promise.reject('Only defaultAlgo is supported for encryption right now');
        }
        return this._processWithDefaultAlgo(true, inPath, outPath, iv, key, authkey);
    }
    decryptFile(inPath, outPath, algo, iv, key, authkey) {
        if (algo !== this._defaultAlgo) {
            return Promise.reject('Only defaultAlgo is supported for decryption right now');
        }
        return this._processWithDefaultAlgo(false, inPath, outPath, iv, key, authkey);
    }
    getTempLocation(filename) {
        let location = electron.app.getPath('temp');
        if (filename) {
            location = path.join(location, filename);
        }
        return Promise.resolve(location);
    }
    moveFile(fromPath, toPath) {
        return new Promise((resolve, reject) => {
            try {
                const tempName = path.basename(fromPath);
                const tempDest = path.join(path.dirname(toPath), tempName);
                const srcStream = fs.createReadStream(fromPath);
                const destStream = fs.createWriteStream(tempDest);
                srcStream.on('error', reject);
                destStream.on('error', reject);
                destStream.on('finish', () => {
                    fs.rename(tempDest, toPath, err => {
                        if (err) {
                            reject(err);
                        }
                        else {
                            fs.unlink(fromPath, err => {
                                if (err) {
                                    logger.warn('[FileEncryption] Failed unlink original file', err);
                                }
                                resolve();
                            });
                        }
                    });
                });
                srcStream.pipe(destStream);
            }
            catch (ex) {
                reject(ex);
            }
        });
    }
    _processWithDefaultAlgo(needEncryption, inPath, outPath, iv, key, authkey) {
        return new Promise((resolve, reject) => {
            if (iv.length !== AES_IV_SIZE) {
                reject(`IV must be ${AES_IV_SIZE} bytes long, got ${iv.length}`);
                return;
            }
            if (key.length !== AES_KEY_SIZE) {
                reject(`Key must be ${AES_KEY_SIZE} bytes long, got ${key.length}`);
                return;
            }
            if (authkey.length !== AUTH_KEY_SIZE) {
                reject(`Auth Key must be ${AUTH_KEY_SIZE} bytes long, got ${key.length}`);
                return;
            }
            const inputStream = fs.createReadStream(inPath);
            if (!inputStream) {
                reject('Could not open input file');
                return;
            }
            const outputStream = fs.createWriteStream(outPath);
            if (!outputStream) {
                reject('Could not open or create output file');
                return;
            }
            const bufferedKey = new Buffer(key);
            const bufferedIv = new Buffer(iv);
            const cipher = needEncryption
                ? crypto.createCipheriv('aes-256-cbc', bufferedKey, bufferedIv)
                : crypto.createDecipheriv('aes-256-cbc', bufferedKey, bufferedIv);
            const hmacGen = crypto.createHmac('sha256', new Buffer(authkey));
            const hashGen = crypto.createHash('sha256');
            hmacGen.update(bufferedIv);
            hashGen.update(bufferedIv);
            inputStream.on('data', (data) => {
                const part = cipher.update(data);
                if (needEncryption) {
                    hmacGen.update(part);
                    hashGen.update(part);
                }
                else {
                    hmacGen.update(data);
                    hashGen.update(data);
                }
                outputStream.write(part);
            });
            inputStream.on('end', function () {
                try {
                    let buf = new Buffer(cipher.final('binary').toString(), 'binary');
                    outputStream.write(buf);
                    outputStream.end();
                    if (needEncryption) {
                        hmacGen.update(buf);
                        hashGen.update(buf);
                    }
                    const hmacBuffer = hmacGen.digest();
                    hashGen.update(hmacBuffer);
                    const hashBuffer = hashGen.digest();
                    const hmac = _.toArray(hmacBuffer);
                    const hash = _.toArray(hashBuffer);
                    outputStream.on('close', function () {
                        resolve({ hmac, hash });
                    });
                }
                catch (e) {
                    fs.unlink(outPath, err => {
                        reject(e);
                    });
                }
            });
        });
    }
}
exports.ElectronFileEncryption = ElectronFileEncryption;
function getInstance() {
    if (electron.remote) {
        return electron.remote.require(__dirname + '/FileEncryption').fileEncryption;
    }
    else {
        return exports.fileEncryption;
    }
}
exports.getInstance = getInstance;
function init() {
    exports.fileEncryption = new ElectronFileEncryption();
}
exports.init = init;
