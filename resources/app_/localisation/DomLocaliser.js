"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class DomLocaliser {
    translateDomElement(rootElement) {
        this._translateElementText(rootElement);
        this._translateElementAttributes(rootElement);
    }
    constructor(getTranslationFunction) {
        this._getTranslation = getTranslationFunction;
    }
    _translateElementText(rootElement) {
        let elementsWithLocalization = rootElement.querySelectorAll('[i18n]');
        for (let i = 0; i < elementsWithLocalization.length; i++) {
            let elem = elementsWithLocalization[i];
            let translationKey = elem.getAttribute('i18n');
            let translationParamsString = elem.getAttribute('i18n-params');
            let translationParams = null;
            if (translationParamsString !== null) {
                translationParams = this._getParamsFromString(translationParamsString);
            }
            if (translationKey) {
                elem.insertAdjacentHTML('afterbegin', this._getTranslation(translationKey, translationParams));
            }
        }
    }
    _translateElementAttributes(rootElement) {
        let elementsWithLocalization = rootElement.querySelectorAll('[i18n-attributes]');
        for (let i = 0; i < elementsWithLocalization.length; i++) {
            let elem = elementsWithLocalization[i];
            let localizationAttributesString = elem.getAttribute('i18n-attributes');
            if (localizationAttributesString) {
                this._translateAttributes(elem, this._getParamsFromString(localizationAttributesString));
            }
        }
    }
    _translateAttributes(elem, localizationAttributes) {
        let attributes = Object.keys(localizationAttributes);
        for (let i = 0; i < attributes.length; i++) {
            let attribute = attributes[i];
            let attributeValue = this._getTranslation(localizationAttributes[attribute]);
            elem.setAttribute(attribute, attributeValue);
        }
    }
    _getParamsFromString(paramsString) {
        let keyValuePairs = paramsString.split(';;');
        let params = {};
        for (let i = 0; i < keyValuePairs.length; i++) {
            let pair = keyValuePairs[i].split('=');
            params[pair.shift()] = pair.join('=');
        }
        return params;
    }
}
exports.DomLocaliser = DomLocaliser;
