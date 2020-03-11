"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
function setup() {
    if (typeof window !== 'undefined') {
        let anyWnd = window;
        anyWnd.CodeCoverageHelpers = anyWnd.CodeCoverageHelpers || {};
        anyWnd.CodeCoverageHelpers.saveElectronCoverageToFile = function (coverage, filename) {
            fs.writeFile(filename, coverage, err => {
                if (err) {
                    console.warn('Failed to write out code coverage results', err);
                }
            });
        };
    }
}
exports.setup = setup;
