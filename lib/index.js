"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var file2html = require("file2html");
var mime = require("file2html/lib/mime");
var file2html_archive_tools_1 = require("file2html-archive-tools");
var pictures_1 = require("./pictures");
var fonts_1 = require("./fonts");
var parse_css_1 = require("./parse-css");
var supportedMimeTypes = [mime.lookup('.epub')];
var pageBodyBeginPattern = /<body[^>]*>/;
var pageBodyEndPattern = /<\/body/;
var htmlSourcePattern = /src="((images|fonts)\/.+)"/g;
var EPUBReader = (function (_super) {
    __extends(EPUBReader, _super);
    function EPUBReader() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    EPUBReader.prototype.read = function (_a) {
        var fileInfo = _a.fileInfo;
        var content = fileInfo.content;
        var byteLength = content.byteLength;
        return file2html_archive_tools_1.readArchive(content).then(function (archive) {
            var meta = Object.assign({
                fileType: file2html.FileTypes.document,
                mimeType: '',
                name: '',
                size: byteLength,
                creator: '',
                createdAt: '',
                modifiedAt: ''
            }, fileInfo.meta);
            var styles = '';
            var content = '';
            return Promise.all([
                pictures_1.parsePictures(archive.folder("OPS/" + pictures_1.folderName)),
                fonts_1.parseFonts(archive.folder("OPS/" + fonts_1.folderName))
            ]).then(function (relationsGroups) {
                var relations = {};
                var queue = [];
                relationsGroups.forEach(function (rels) { return Object.assign(relations, rels); });
                archive.forEach(function (relativePath, file) {
                    if (relativePath.indexOf('css/') >= 0) {
                        queue.push(parse_css_1.default(file, relations).then(function (css) {
                            styles += css + "\n";
                        }));
                    }
                    else if (relativePath.indexOf('.xhtml') > 0 && relativePath.indexOf('TOC.xhtml') < 0) {
                        queue.push(file.async('string').then(function (html) {
                            var pageBodyBeginMatch = html.match(pageBodyBeginPattern);
                            if (!pageBodyBeginMatch) {
                                return;
                            }
                            var pageBodyEndMatch = html.match(pageBodyEndPattern);
                            if (!pageBodyEndMatch) {
                                return;
                            }
                            var pageName = relativePath.split('/').pop().split('.')[0];
                            content += "<div id=\"" + pageName + "\">" + html.slice(pageBodyBeginMatch.index + pageBodyBeginMatch[0].length, pageBodyEndMatch.index).replace(htmlSourcePattern, function (_input) {
                                var args = [];
                                for (var _i = 1; _i < arguments.length; _i++) {
                                    args[_i - 1] = arguments[_i];
                                }
                                var src = relations[args[0]];
                                if (src) {
                                    return "src=\"" + src + "\"";
                                }
                                return '';
                            }) + "</div>";
                        }));
                    }
                });
                return Promise.all(queue).then(function () { return new file2html.File({
                    meta: meta,
                    styles: "<style>" + styles + "</style>",
                    content: "<div>" + content + "</div>"
                }); });
            });
        });
    };
    EPUBReader.testFileMimeType = function (mimeType) {
        return supportedMimeTypes.indexOf(mimeType) >= 0;
    };
    return EPUBReader;
}(file2html.Reader));
exports.default = EPUBReader;
