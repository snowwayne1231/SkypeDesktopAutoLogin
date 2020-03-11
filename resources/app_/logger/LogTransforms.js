"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stream_1 = require("stream");
class LogTransform extends stream_1.PassThrough {
    _transform(message, encoding, callback) {
        return;
    }
}
exports.LogTransform = LogTransform;
class SkypetokenTransform extends LogTransform {
    constructor() {
        super({ objectMode: true });
    }
    _transform(message, encoding, callback) {
        message = message.replace(SkypetokenTransform.skypetokenRegexp, '$1[hidden_skypetoken]');
        message = message.replace(SkypetokenTransform.msaRegexp, '[hidden_token]');
        this.push(message, encoding);
        callback();
    }
}
SkypetokenTransform.skypetokenRegexp = /([A-Za-z0-9-_]{10,})\.([A-Za-z0-9-_]{10,})\.([A-Za-z0-9-_]{10,})/g;
SkypetokenTransform.msaRegexp = /=?([A-Za-z0-9\/\*%\+!]{100,}=*)/g;
exports.SkypetokenTransform = SkypetokenTransform;
