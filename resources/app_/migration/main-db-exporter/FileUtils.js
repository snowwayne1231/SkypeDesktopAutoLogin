"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
function ensureDir(dirPath) {
    const normalizedPath = path.resolve(dirPath);
    if (isDir(normalizedPath)) {
        return;
    }
    if (isFile(normalizedPath)) {
        throw new Error('Specified path resolves to a file.');
    }
    mkdirp(normalizedPath);
}
exports.ensureDir = ensureDir;
function getStats(dirPath) {
    let stats;
    try {
        stats = fs.statSync(dirPath);
    }
    catch (err) {
    }
    return stats;
}
function isDir(dirPath) {
    let stats = getStats(dirPath);
    return stats && stats.isDirectory() ? true : false;
}
function isFile(dirPath) {
    let stats = getStats(dirPath);
    return stats && stats.isFile() ? true : false;
}
function mkdirp(dirPath) {
    const normalizedPath = path.resolve(dirPath);
    try {
        fs.mkdirSync(normalizedPath);
    }
    catch (err) {
        if (err.code === 'ENOENT') {
            mkdirp(path.dirname(normalizedPath));
            return mkdirp(normalizedPath);
        }
        if (isDir(normalizedPath)) {
            return;
        }
        throw err;
    }
}
function findFile(root, fileToFind, level = 2) {
    const result = [];
    if (!root || !isDir(root) || level === 0) {
        return result;
    }
    if (searchThisLevel(root, fileToFind)) {
        result.push(root);
    }
    const newLevel = level - 1;
    const subDirs = getSubdirs(root);
    subDirs.forEach((dirName) => {
        const subDirPath = path.join(root, dirName);
        result.push(...findFile(subDirPath, fileToFind, newLevel));
    });
    return result;
}
exports.findFile = findFile;
function searchThisLevel(dirName, fileToFind) {
    const files = fs.readdirSync(dirName);
    if (!files) {
        return false;
    }
    const index = files.indexOf(fileToFind);
    return (index > -1);
}
function getSubdirs(dirName) {
    const files = fs.readdirSync(dirName);
    if (!files) {
        return [];
    }
    const result = files.filter((item) => isDir(path.join(dirName, item)));
    return result;
}
function isMac() {
    return process.platform === 'darwin';
}
exports.isMac = isMac;
function isWindows() {
    return process.platform === 'win32';
}
exports.isWindows = isWindows;
function isLinux() {
    return process.platform === 'linux';
}
exports.isLinux = isLinux;
