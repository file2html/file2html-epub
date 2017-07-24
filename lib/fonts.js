"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var mime_1 = require("file2html/lib/mime");
exports.folderName = 'fonts';
function parseFonts(picturesFolder) {
    var relations = {};
    if (!picturesFolder) {
        return Promise.resolve(relations);
    }
    var queue = [];
    picturesFolder.forEach(function (relativePath, fileEntry) {
        queue.push(fileEntry.async('base64').then(function (base64) {
            relations[exports.folderName + "/" + relativePath] = "data:" + mime_1.lookup(relativePath) + ";base64," + base64;
        }));
    });
    return Promise.all(queue).then(function () { return relations; });
}
exports.parseFonts = parseFonts;
