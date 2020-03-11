"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class MenuLabelDecorator {
    constructor() {
        this._usedCharacterCodes = new Set();
    }
    getLabel(str, needsMoreInfo = false) {
        let insertPositon = -1;
        let lowerCasedStr = str.toLowerCase();
        for (let i = 0; i < str.length; i++) {
            let charCode = lowerCasedStr.charCodeAt(i);
            if (charCode >= MenuLabelDecorator.aCode && charCode <= MenuLabelDecorator.zCode && !this._usedCharacterCodes.has(charCode)) {
                insertPositon = i;
                this._usedCharacterCodes.add(charCode);
                break;
            }
        }
        if (insertPositon === -1) {
            for (let i = 0; i < str.length; i++) {
                let charCode = lowerCasedStr.charCodeAt(i);
                if (!this._usedCharacterCodes.has(charCode)) {
                    insertPositon = i;
                    this._usedCharacterCodes.add(charCode);
                    break;
                }
            }
        }
        if (insertPositon !== -1) {
            str = `${str.slice(0, insertPositon)}&${str.slice(insertPositon)}`;
        }
        if (needsMoreInfo) {
            str = str + '...';
        }
        return str;
    }
}
MenuLabelDecorator.aCode = 97;
MenuLabelDecorator.zCode = 122;
exports.MenuLabelDecorator = MenuLabelDecorator;
