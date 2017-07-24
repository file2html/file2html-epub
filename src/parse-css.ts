import {ArchiveEntry} from 'file2html-archive-tools';
import {Relations} from './index';

const cssSourcePattern: RegExp = /url\(.+((images|fonts)\/.+)\)/g;
const endQuotesPattern: RegExp = /"|'$/;
const invalidHeightRulePattern: RegExp = /hieght/g;
const invalidSmallCapsValuePattern: RegExp = /smallcaps/g;
const invalidTenfoldPixelValue: RegExp = /opx/g;

export default function parseCSS (file: ArchiveEntry, relations: Relations): Promise<string> {
    return file.async('string').then((css: string) => {
        cssSourcePattern.lastIndex = 0;

        return css
            .replace(invalidHeightRulePattern, 'height')
            .replace(invalidSmallCapsValuePattern, 'small-caps')
            .replace(invalidTenfoldPixelValue, '0px')
            .replace(cssSourcePattern, (_input: string, ...args: any[]) => {
                const src: string = relations[args[0].replace(endQuotesPattern, '')];

                if (src) {
                    return `url("${ src }")`;
                }

                return 'none';
            });
    });
}