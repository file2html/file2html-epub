import {Relations} from './index';
import {resolveCSSRelations} from './relations';

const invalidHeightRulePattern: RegExp = /hieght/g;
const invalidSmallCapsValuePattern: RegExp = /smallcaps/g;
const invalidTenfoldPixelValue: RegExp = /opx/g;

export default function parseCSS (css: string, relations: Relations): string {
    return resolveCSSRelations(css
        .replace(invalidHeightRulePattern, 'height')
        .replace(invalidSmallCapsValuePattern, 'small-caps')
        .replace(invalidTenfoldPixelValue, '0px'),
        relations
    );
}