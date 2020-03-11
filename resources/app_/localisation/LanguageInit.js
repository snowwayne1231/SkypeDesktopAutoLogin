"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron = require("electron");
const DomLocaliser_1 = require("./DomLocaliser");
const Localisation_1 = require("./Localisation");
function buildLanguageDetector() {
    if (electron.remote) {
        return electron.remote.require(__dirname + '/LanguageInit').language;
    }
    else {
        let detectionFunction = () => electron.app.getLocale();
        return new Localisation_1.Localisation(detectionFunction);
    }
}
exports.language = buildLanguageDetector();
function buildDomLocaliser() {
    return new DomLocaliser_1.DomLocaliser(exports.language.getString);
}
exports.domLocaliser = buildDomLocaliser();
function init() {
    exports.language.updateConfig();
}
exports.init = init;
