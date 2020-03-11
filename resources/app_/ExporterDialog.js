"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const LanguageInit_1 = require("./localisation/LanguageInit");
const Logger_1 = require("./logger/Logger");
const Platform_1 = require("./tools/Platform");
const WindowBase_1 = require("./WindowBase");
class ExporterDialog extends WindowBase_1.WindowBase {
    constructor() {
        super({
            'title': LanguageInit_1.language.getString(Platform_1.isLinux() ? 'Menu.ExportHistoryLinuxLabel' : 'Menu.ExportHistoryLabel'),
            'width': 600,
            'height': 500,
            'useContentSize': true,
            'resizable': true,
            'fullscreen': false,
            'show': false,
            'webPreferences': {
                'preload': path.join(__dirname, 'exporter-dialog', 'Preload.js'),
                'nodeIntegration': false,
                'webSecurity': true,
                'additionalArguments': ['--skype-process-type=Dialog']
            }
        });
        this.window.setMenu(null);
        this.webContents.on('did-finish-load', () => {
            Logger_1.getInstance().info('[ExporterDialog] Showing Exporter dialog');
            this.window.show();
        });
        this.window.on('close', () => {
            Logger_1.getInstance().info('[ExporterDialog] Closing Exporter dialog');
        });
        const aboutUrl = 'file:///exporter-dialog/index.html';
        this.window.loadURL(aboutUrl);
    }
}
exports.ExporterDialog = ExporterDialog;
