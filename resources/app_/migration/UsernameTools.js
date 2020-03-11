"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = require("crypto");
const Platform_1 = require("../tools/Platform");
const isStandardUsernameChar = (ch) => {
    return ((ch >= '0' && ch <= '9')
        || (ch >= 'a' && ch <= 'z')
        || ch === '-'
        || ch === '_'
        || ch === ','
        || ch === '.');
};
const isPlatformUnsafeChar = (char) => {
    const code = char.charCodeAt(0);
    const unsafeChars = (Platform_1.isWindows() ? '<>:"/\\|' : '/').split('');
    return (code < 32 || (code < 127 && unsafeChars.indexOf(char) > -1));
};
const toHex = (ch) => '#' + ch.charCodeAt(0).toString(16);
const toArrayOfSingleChars = (acc, char) => (acc.push(...char.split('')), acc);
function escapeUsername(username) {
    let escapedChars = username
        .split('')
        .map(ch => ch.toLowerCase())
        .map(ch => isStandardUsernameChar(ch) ? ch : toHex(ch))
        .reduce(toArrayOfSingleChars, []);
    if (Platform_1.isWindows()) {
        const tmpUsername = escapedChars.join('');
        if (tmpUsername.match(/^(con|prn|aux|nul|clock\$|com\d|lpt\d)$/i)) {
            escapedChars[0] = toHex(escapedChars[0]);
        }
    }
    escapedChars = escapedChars
        .reduce(toArrayOfSingleChars, [])
        .map(ch => isPlatformUnsafeChar(ch) ? toHex(ch) : ch);
    if (escapedChars[escapedChars.length - 1] === '.') {
        escapedChars.push('#');
    }
    const safeUsername = escapedChars.join('');
    return safeUsername;
}
exports.escapeUsername = escapeUsername;
function hashSkypeName(str) {
    const payload = `Skype4LifeHashSalt-${str}`;
    return crypto.createHash('sha256').update(payload).digest('hex');
}
exports.hashSkypeName = hashSkypeName;
