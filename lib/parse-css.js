"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var cssSourcePattern = /url\(.+((images|fonts)\/.+)\)/g;
var endQuotesPattern = /"|'$/;
var invalidHeightRulePattern = /hieght/g;
var invalidSmallCapsValuePattern = /smallcaps/g;
var invalidTenfoldPixelValue = /opx/g;
function parseCSS(file, relations) {
    return file.async('string').then(function (css) {
        cssSourcePattern.lastIndex = 0;
        return css
            .replace(invalidHeightRulePattern, 'height')
            .replace(invalidSmallCapsValuePattern, 'small-caps')
            .replace(invalidTenfoldPixelValue, '0px')
            .replace(cssSourcePattern, function (_input) {
            var args = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                args[_i - 1] = arguments[_i];
            }
            var src = relations[args[0].replace(endQuotesPattern, '')];
            if (src) {
                return "url(\"" + src + "\")";
            }
            return 'none';
        });
    });
}
exports.default = parseCSS;
