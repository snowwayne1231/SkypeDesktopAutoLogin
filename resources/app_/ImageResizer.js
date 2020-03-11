"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron = require("electron");
class ImageResizer {
    createResizedImage(inputPath, newWidth, newHeight, compressFormat, quality, rotation) {
        return new Promise((resolve, reject) => {
            const orig = electron.nativeImage.createFromDataURL(inputPath);
            const resizedImage = orig.resize({
                height: newHeight,
                width: newWidth
            });
            const [encodedImage, mimeType] = this._convertImageAndGetMimeType(resizedImage, compressFormat, quality);
            if (!encodedImage) {
                reject('Unsupported compressFormat ' + compressFormat);
                return;
            }
            const blob = new Blob([encodedImage], { type: mimeType });
            resolve({
                size: encodedImage.byteLength,
                uri: URL.createObjectURL(blob)
            });
        });
    }
    _convertImageAndGetMimeType(image, compressFormat, quality) {
        let mimeType;
        let outputData;
        switch (compressFormat) {
            case 'JPEG':
                mimeType = 'image/jpeg';
                outputData = image.toJPEG(quality);
                break;
            case 'PNG':
                mimeType = 'image/png';
                outputData = image.toPNG();
                break;
            default:
                mimeType = '';
                outputData = undefined;
                break;
        }
        return [outputData, mimeType];
    }
}
exports.ImageResizer = ImageResizer;
