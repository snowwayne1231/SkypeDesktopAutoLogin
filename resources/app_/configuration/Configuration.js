"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const LogLevel_1 = require("../logger/LogLevel");
const Platform_1 = require("../tools/Platform");
const hockeyAppID = Platform_1.pickByPlatform('a741743329d94bc08826af367733939d', '590a6ee7ae5b40618f24655aa36fc84f', '70b7a841531e4f9a9b55ff40f9d0fb67');
let configuration = {
    environment: 'production',
    appShortName: Platform_1.pickByPlatform('skype-preview', 'skype-preview', 'skypeforlinux'),
    appExeName: Platform_1.pickByPlatform('Skype', 'Skype', 'skypeforlinux'),
    appDataDir: Platform_1.pickByPlatform('Microsoft/Skype for Desktop', 'Microsoft/Skype for Desktop', 'skypeforlinux'),
    appNameKey: 'ApplicationName',
    tenantToken: 'a173030604a34bdcbf21ca59134c7430-2a34e3b5-60e1-4a11-ad6d-2e9eac9ac07c-6614',
    enableUpdates: true,
    fallbackUpdaterFeedUrl: 'https://get.skype.com/s4l-update',
    autoStartSupported: true,
    debugCrashEnabled: false,
    debugMenuIncluded: false,
    debugMenuAddShortcut: true,
    ecsHost: 'a.config.skype.com,b.config.skype.com',
    log: {
        enableLogging: false,
        consoleLogging: false,
        loggingLevel: LogLevel_1.LogLevel.INFO,
        logsPath: 'logs',
        enableLogCleaning: true,
        additionalLogPathsToClean: ['skylib']
    },
    crashReporterUrl: !hockeyAppID ? undefined : `https://rink.hockeyapp.net/api/2/apps/${hockeyAppID}/crashes/upload`,
    isMsix: false
};
exports.default = configuration;
