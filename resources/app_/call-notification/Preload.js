"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DomUtils_1 = require("../security/DomUtils");
const PopupWindowApi_1 = require("../popup-window/PopupWindowApi");
const PreloadShared_1 = require("../PreloadShared");
window['callNotificationApi'] = new PopupWindowApi_1.PopupWindowApiImpl();
PreloadShared_1.overrideLogger();
DomUtils_1.disableDragAndDrop();
