"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron = require("electron");
class DelphiMigration {
}
exports.DelphiMigration = DelphiMigration;
function buildMigration() {
    if (electron.remote) {
        return electron.remote.require(__dirname + '/DelphiMigration').delphiMigration;
    }
    else {
        return new DelphiMigration();
    }
}
exports.delphiMigration = buildMigration();
