"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class CachedPublisher {
    constructor() {
        this._listeners = new Map();
        this._cachedEvents = new Map();
    }
    subscribe(eventName, callback) {
        if (!this._listeners.has(eventName)) {
            this._listeners.set(eventName, []);
        }
        this._listeners.get(eventName).push(callback);
        if (this._cachedEvents.has(eventName)) {
            this._cachedEvents.get(eventName).forEach((args) => {
                callback(...args);
            });
            this._cachedEvents.delete(eventName);
        }
    }
    emitEvent(eventName, ...args) {
        if (!this._listeners.has(eventName)) {
            if (!this._cachedEvents.has(eventName)) {
                this._cachedEvents.set(eventName, []);
            }
            this._cachedEvents.get(eventName).push(args);
        }
        else {
            this._listeners.get(eventName).forEach((sub) => {
                sub(...args);
            });
        }
    }
}
exports.CachedPublisher = CachedPublisher;
