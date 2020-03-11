"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const stream_1 = require("stream");
const File_1 = require("../tools/File");
const LogFormatter_1 = require("./LogFormatter");
class WriteStreamTarget extends stream_1.PassThrough {
    constructor(stream) {
        super();
        if (stream) {
            this.setStream(stream);
        }
    }
    setStream(stream) {
        if (this.stream) {
            this.unpipe(this.stream);
            this.stream.end();
        }
        this.stream = stream;
        this.pipe(stream);
    }
    write(formattedMessage, encoding, cb) {
        this._write(formattedMessage, encoding, cb);
        return true;
    }
    _write(chunk, encoding, cb) {
        this.push(chunk, encoding);
        if (cb) {
            process.nextTick(() => {
                cb(null, true);
            });
        }
    }
}
exports.WriteStreamTarget = WriteStreamTarget;
class STDOutTarget extends WriteStreamTarget {
    constructor() {
        super(process.stdout);
    }
}
exports.STDOutTarget = STDOutTarget;
const MAX_FILE_SIZE = 20 * 1000 * 1000;
const MAX_TIME_AFTER_CREATING = 1000 * 60 * 60 * 24;
class FileTarget extends WriteStreamTarget {
    constructor(folder, options, lazyInitialization = true) {
        super();
        this.size = 0;
        this.iteration = 1;
        this.needsLazyInitialization = false;
        this.maxFileSize = (options && options.maxFileSize) || MAX_FILE_SIZE;
        this.path = path.resolve(folder);
        File_1.ensureDir(this.path);
        if (lazyInitialization) {
            this.needsLazyInitialization = true;
            this.lazyInitializationFunction = this._setCurrentFile;
        }
        else {
            this._setCurrentFile();
        }
    }
    write(formattedMessage, encoding, cb) {
        if (this.needsLazyInitialization) {
            this.lazyInitializationFunction();
            this.needsLazyInitialization = false;
        }
        this._write(formattedMessage, encoding, cb);
        this.size += formattedMessage.length || 0;
        this._drainStream();
        if (this.size > this.maxFileSize) {
            this._write(LogFormatter_1.getMaxFileSizeReachedMessage(this.size));
            this._createNewFile();
        }
        if (Date.now() > this.fileCreatedTimestamp + MAX_TIME_AFTER_CREATING) {
            this._write(LogFormatter_1.getMaxTimeReachedMessage());
            this._createNewFile();
        }
        return true;
    }
    _write(chunk, encoding, cb) {
        const success = encoding ? this.stream.write(chunk, encoding) : this.stream.write(chunk);
        if (!cb) {
            return;
        }
        if (success === false) {
            this.stream.once('drain', () => {
                cb(null, true);
            });
            return;
        }
        process.nextTick(() => {
            cb(null, true);
        });
    }
    _drainStream() {
        if (!this.isDraining) {
            this.isDraining = true;
            this.stream.once('drain', () => {
                this.isDraining = false;
            });
        }
    }
    _createNewFile() {
        this.unpipe(this.stream);
        this.stream.end();
        this.size = 0;
        if (this.fileName === this._createFileName()) {
            this.iteration += 1;
        }
        else {
            this.iteration = 1;
        }
        this._setCurrentFile();
    }
    _createFileName() {
        let date = (new Date()).toISOString().replace(/:|\./g, '-');
        return path.join(this.path, `skype-${date}${this.iteration === 1 ? '' : '-' + this.iteration}.log`);
    }
    _setCurrentFile() {
        this.fileName = this._createFileName();
        this.fileCreatedTimestamp = Date.now();
        const options = {
            flags: 'a',
            defaultEncoding: 'utf8',
            autoClose: true
        };
        const stream = fs.createWriteStream(this.fileName, options);
        this.setStream(stream);
    }
}
exports.FileTarget = FileTarget;
