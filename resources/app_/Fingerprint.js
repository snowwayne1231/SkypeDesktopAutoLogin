"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const os = require("os");
const DeviceInfo_1 = require("./DeviceInfo");
class Fingerprint {
    static getIpaAddresses() {
        let interfaces = os.networkInterfaces();
        let addresses = [];
        for (let k in interfaces) {
            for (let k2 in interfaces[k]) {
                addresses.push(interfaces[k][k2].address);
            }
        }
        return addresses;
    }
    static getApplicationGuid() {
        let deviceId = DeviceInfo_1.deviceInfo.getId() || '00000000000000000000000000000000';
        return Fingerprint.formatGuid(deviceId);
    }
    static formatGuid(unformattedGuid) {
        const lengths = [8, 4, 4, 4, 12];
        const parts = [];
        let startPos = 0;
        for (let i = 0; i < lengths.length; i++) {
            parts.push(unformattedGuid.slice(startPos, startPos + lengths[i]));
            startPos += lengths[i];
        }
        return parts.join('-');
    }
    static getFingerprintData() {
        return {
            applicationId: electron_1.app.getName(),
            applicationGuid: Fingerprint.getApplicationGuid(),
            applicationVersion: electron_1.app.getVersion(),
            ipAddresses: Fingerprint.getIpaAddresses(),
            osVersion: os.release(),
            osPlatform: os.platform(),
            osType: os.type(),
            timestamp: Date.now()
        };
    }
}
exports.getFingerprintData = Fingerprint.getFingerprintData;
