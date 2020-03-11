"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const Platform_1 = require("./tools/Platform");
const { Menu, MenuItem } = electron_1.remote;
class ContextMenu {
    constructor(_spellCheckHandler, windowOrWebView = null, _logger, _language) {
        this._spellCheckHandler = _spellCheckHandler;
        this._logger = _logger;
        this._language = _language;
        this._shouldHavePasteAsPlainTextOption = false;
        electron_1.remote.ipcMain.addListener('set-paste-as-plain-text', (event, value) => {
            this.setPasteAsPlainTextOption(value);
        });
        windowOrWebView = windowOrWebView || electron_1.remote.getCurrentWebContents();
        let ctorName = Object.getPrototypeOf(windowOrWebView).constructor.name;
        if (ctorName === 'WebContents') {
            this._getWebContents = () => windowOrWebView;
        }
        else {
            this._getWebContents = 'webContents' in windowOrWebView
                ? () => windowOrWebView.webContents
                : () => windowOrWebView.getWebContents();
        }
    }
    showPopupMenu(contextInfo) {
        return __awaiter(this, void 0, void 0, function* () {
            let menu = yield this._buildMenuForElement(contextInfo);
            if (!menu) {
                return;
            }
            menu.popup({ window: electron_1.remote.getCurrentWindow() });
        });
    }
    _buildMenuForElement(contextInfo) {
        return __awaiter(this, void 0, void 0, function* () {
            this._logger.debug(`[ContextMenu] Got context menu event with args: ${JSON.stringify(contextInfo)}`);
            if (contextInfo.isEditable || (contextInfo.inputFieldType && contextInfo.inputFieldType !== 'none')) {
                return yield this._buildMenuForTextInput(contextInfo);
            }
            return null;
        });
    }
    _buildMenuForTextInput(contextInfo) {
        return __awaiter(this, void 0, void 0, function* () {
            let menu = new Menu();
            yield this._addSpellingItems(menu, contextInfo);
            this._addCut(menu, contextInfo);
            this._addCopy(menu, contextInfo);
            this._addPaste(menu, contextInfo);
            if (this._shouldHavePasteAsPlainTextOption) {
                this._addPastePlain(menu, contextInfo);
            }
            return menu;
        });
    }
    _addSpellingItems(menu, contextInfo) {
        return __awaiter(this, void 0, void 0, function* () {
            let target = this._getWebContents();
            if (!contextInfo.misspelledWord || contextInfo.misspelledWord.length < 1) {
                return menu;
            }
            if (!this._spellCheckHandler.currentSpellchecker) {
                return menu;
            }
            let corrections = yield this._spellCheckHandler.getCorrectionsForMisspelling(contextInfo.misspelledWord);
            if (!corrections || !corrections.length) {
                return menu;
            }
            corrections.forEach(correction => {
                let item = new MenuItem({
                    label: correction,
                    click: () => target.replaceMisspelling(correction)
                });
                menu.append(item);
            });
            this._addSeparator(menu);
            if (process.platform === 'darwin') {
                let learnWord = new MenuItem({
                    label: this._language.getString('Menu.AddToDictionaryLabel'),
                    click: () => __awaiter(this, void 0, void 0, function* () {
                        target.replaceMisspelling(contextInfo.selectionText);
                        try {
                            yield this._spellCheckHandler.addToDictionary(contextInfo.misspelledWord);
                        }
                        catch (e) {
                            this._logger.error(`[ContextMenu] Failed to add entry to dictionary: ${e.message}`);
                        }
                    })
                });
                menu.append(learnWord);
            }
            return menu;
        });
    }
    _addCut(menu, menuInfo) {
        menu.append(new MenuItem({
            label: this._language.getString('Menu.CutLabel'),
            enabled: menuInfo.editFlags.canCut,
            accelerator: 'CmdOrCtrl+X',
            role: 'cut'
        }));
        return menu;
    }
    _addCopy(menu, menuInfo) {
        menu.append(new MenuItem({
            label: this._language.getString('Menu.CopyLabel'),
            accelerator: 'CmdOrCtrl+C',
            enabled: menuInfo.editFlags.canCopy,
            role: 'copy'
        }));
        return menu;
    }
    _addPaste(menu, menuInfo) {
        menu.append(new MenuItem({
            label: this._language.getString('Menu.PasteLabel'),
            accelerator: 'CmdOrCtrl+V',
            enabled: menuInfo.editFlags.canPaste,
            role: 'paste'
        }));
        return menu;
    }
    _addPastePlain(menu, menuInfo) {
        menu.append(new MenuItem({
            label: this._language.getString('Menu.PastePlainLabel'),
            accelerator: Platform_1.isMac() ? 'Cmd+Option+Shift+V' : 'Ctrl+Shift+V',
            enabled: menuInfo.editFlags.canPaste,
            role: 'pasteandmatchstyle'
        }));
        return menu;
    }
    _addSeparator(menu) {
        menu.append(new MenuItem({ type: 'separator' }));
        return menu;
    }
    setPasteAsPlainTextOption(value) {
        if (this._shouldHavePasteAsPlainTextOption === value) {
            return;
        }
        this._shouldHavePasteAsPlainTextOption = value;
    }
}
exports.ContextMenu = ContextMenu;
