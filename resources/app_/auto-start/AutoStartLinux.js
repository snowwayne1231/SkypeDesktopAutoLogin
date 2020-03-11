"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const os = require("os");
const path = require("path");
const AutoStartBase_1 = require("./AutoStartBase");
const File_1 = require("../tools/File");
const Logger_1 = require("../logger/Logger");
class AutoStartLinux extends AutoStartBase_1.AutoStartBase {
    _enable(isEnabled) {
        if (isEnabled) {
            this._createFile();
        }
        else {
            this._removeFile();
        }
    }
    _createFile() {
        try {
            File_1.ensureDir(this._dir);
            fs.writeFileSync(this._file, this._content);
            Logger_1.getInstance().info(`[AutoStartLinux] Created file ${this._file}`);
        }
        catch (err) {
            Logger_1.getInstance().error(`[AutoStartLinux] Unable to create file ${this._file}`, err);
        }
    }
    _removeFile() {
        try {
            fs.unlinkSync(this._file);
        }
        catch (err) {
            Logger_1.getInstance().error(`[AutoStartLinux] Unable to remove file ${this._file}`, err);
        }
    }
    get _dir() {
        return path.join(os.homedir(), '.config', 'autostart');
    }
    get _file() {
        return path.join(this._dir, 'skypeforlinux.desktop');
    }
    get _content() {
        return [
            '[Desktop Entry]',
            'Name=Skype for Linux',
            'Comment=Skype Internet Telephony',
            'Exec=/usr/bin/skypeforlinux',
            'Icon=skypeforlinux',
            'Terminal=false',
            'Type=Application',
            'StartupNotify=false',
            'X-GNOME-Autostart-enabled=true'
        ].join('\n');
    }
}
exports.AutoStartLinux = AutoStartLinux;
