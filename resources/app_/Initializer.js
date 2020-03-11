"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const os = require("os");
const authStore = require("./login/AuthStore");
const clientVersion = require("./ClientVersion");
const clipboardManager = require("./ClipboardManager");
const cspHandler = require("./security/CspViolationHandler");
const DeviceInfo_1 = require("./DeviceInfo");
const downloader = require("./Downloader");
const downloadManager = require("./DownloadManager");
const ecsConfig = require("./ecs/EcsConfigInit");
const environmentInfoProvider = require("./EnvironmentInfoProvider");
const fileEncryption = require("./FileEncryption");
const geolocationService = require("./geolocation/GeolocationService");
const highContrast = require("./accessibility/HighContrast");
const jsExceptionHandler = require("./JsExceptionHandler");
const keychainStore = require("./login/KeychainStore");
const language = require("./localisation/LanguageInit");
const logger = require("./logger/Logger");
const screenshotProvider = require("./ScreenshotProvider");
const Settings_1 = require("./Settings");
const ssidStore = require("./SsidStore");
const systemIdle = require("./presence/SystemIdle");
const systemTheme = require("./tools/SystemTheme");
const telemetryLogger = require("./telemetry/TelemetryLoggerInit");
const userTools = require("./tools/User");
function initializeUpdaterDependencies(appConfig, initializationTimestamp) {
    Settings_1.settings.init();
    environmentInfoProvider.init(initializationTimestamp);
    logger.init(appConfig);
    logger.getInstance().init();
    clientVersion.init();
    authStore.init();
    clipboardManager.init();
    keychainStore.init(logger.getInstance());
    telemetryLogger.init(appConfig, clientVersion.getInstance(), DeviceInfo_1.deviceInfo, language.language);
    downloader.init(logger.getInstance());
    downloadManager.init(downloader.getInstance());
    fileEncryption.init();
    ecsConfig.init(appConfig.ecsHost, logger.getInstance(), clientVersion.getInstance(), DeviceInfo_1.deviceInfo);
    jsExceptionHandler.init(appConfig, logger.getInstance(), clientVersion.getInstance(), DeviceInfo_1.deviceInfo, environmentInfoProvider.getInstance());
    cspHandler.init(appConfig, logger.getInstance());
    screenshotProvider.init();
    ssidStore.init(logger.getInstance());
    systemIdle.init(logger.getInstance(), ecsConfig.getInstance());
    systemTheme.init(logger.getInstance());
    highContrast.init(logger.getInstance());
    userTools.init(logger.getInstance());
    geolocationService.init(logger.getInstance());
}
exports.initializeUpdaterDependencies = initializeUpdaterDependencies;
function run(appConfig) {
    ecsConfig.getInstance().on('ecs-data-ready', () => {
        telemetryLogger.telemetryLogger.setEcsConfig(ecsConfig.getInstance());
    });
    jsExceptionHandler.getInstance().registerExceptionHandlerMain();
    logger.getInstance().info(getInitialLogMessage(appConfig));
}
exports.run = run;
function getInitialLogMessage(appConfig) {
    let systemMessage = `Skype logging system information:${os.EOL}`;
    systemMessage += `============================================================${os.EOL}`
        + `  Version ${clientVersion.getInstance().getFullVersion()}${os.EOL}`
        + `  Ring: ${appConfig.environment}${os.EOL}`
        + `  Operating System: ${os.type()}, ${os.platform()} ${os.release()}${os.EOL}`
        + `  Architecture: ${os.arch()}${os.EOL}`
        + `  Total Memory: ${os.totalmem() / 1024 / 1024} MB${os.EOL}`
        + `  Free Memory: ${os.freemem() / 1024 / 1024} MB${os.EOL}`
        + `  Load average: ${os.loadavg()}${os.EOL}`
        + `  Device Id: ${DeviceInfo_1.deviceInfo.getId()}${os.EOL}`
        + `  CPU Topology: ${JSON.stringify(os.cpus())}${os.EOL}`
        + `============================================================${os.EOL}`;
    return systemMessage;
}
