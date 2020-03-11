"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Application_1 = require("./Application");
const ClientVersion_1 = require("./ClientVersion");
const Downloader_1 = require("./Downloader");
const EcsConfigInit_1 = require("./ecs/EcsConfigInit");
const initializer = require("./Initializer");
const LanguageInit_1 = require("./localisation/LanguageInit");
const Logger_1 = require("./logger/Logger");
const PackageInfo_1 = require("./configuration/PackageInfo");
const Settings_1 = require("./Settings");
const UpdateEventType_1 = require("./updater/UpdateEventType");
const Updater_1 = require("./updater/Updater");
const User_1 = require("./tools/User");
function init(configuration, initializationTimestamp) {
    let updater;
    let logger;
    let clientVersion;
    let downloader;
    let userTools;
    try {
        initializer.initializeUpdaterDependencies(configuration, initializationTimestamp);
        logger = Logger_1.getInstance();
        clientVersion = ClientVersion_1.getInstance();
        downloader = Downloader_1.getInstance();
        userTools = User_1.getInstance();
        updater = new Updater_1.Updater(logger, EcsConfigInit_1.getInstance(), configuration, clientVersion.getVersion(), Settings_1.settings, downloader, userTools);
        updater.start();
        EcsConfigInit_1.getInstance().on('ecs-data-ready', () => {
            updater.checkForUpdates(false);
        });
        initializer.run(configuration);
        return new Application_1.Application(configuration, logger, clientVersion, LanguageInit_1.language, updater);
    }
    catch (e) {
        const packageData = PackageInfo_1.readPackageJson().getData();
        const version = `${packageData.appVersion}.${packageData.cobrand}.${packageData.appBuild}`;
        downloader = Downloader_1.getInstance();
        userTools = User_1.getInstance();
        updater = new Updater_1.Updater(undefined, undefined, configuration, version, Settings_1.settings, downloader, userTools);
        updater.start();
        updater.installWindowsMandatoryUpdatesIfPresent();
        updater.subscribe(Updater_1.Updater.UPDATE_RESULT, (result) => {
            if (result === UpdateEventType_1.UpdateEventType.UpdateDownloaded) {
                updater.quitAndInstall();
            }
        });
        throw new Error('Application failed to initialize, updater was started.');
    }
}
exports.init = init;
