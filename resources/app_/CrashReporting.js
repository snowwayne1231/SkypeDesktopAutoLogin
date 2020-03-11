"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const Configuration_1 = require("./configuration/Configuration");
const DeviceInfo_1 = require("./DeviceInfo");
const Platform_1 = require("./tools/Platform");
function initializeCrashReporter() {
    if (Configuration_1.default.crashReporterUrl) {
        electron_1.crashReporter.start({
            productName: Configuration_1.default.appShortName,
            companyName: 'Skype',
            submitURL: Configuration_1.default.crashReporterUrl,
            uploadToServer: true,
            extra: {
                environment: Configuration_1.default.environment,
                hockeyApp_crashReporterKey: DeviceInfo_1.deviceInfo.getId() || '',
                enable_unified_log_attachment: Platform_1.isWindows() ? 'true' : 'false'
            }
        });
    }
}
exports.initializeCrashReporter = initializeCrashReporter;
