import {Relations} from './index';

const htmlSourcePattern: RegExp = /(:href|href|src)="([^"]+)"/g;
const cssSourcePattern: RegExp = /url\(([^)]+)\)/g;
const endQuotesPattern: RegExp = /["']$/;
const startQuotesPattern: RegExp = /^["']/;

/**
 * @description According to the version of WPUB relationPath might be:
 *  oebps: '../data/relation_name.png'
 *  epub: 'images/relation_name.png', 'fonts/relation_name.png'
 * @param {Relations} relations
 * @param {string} relationPath
 * @returns {string}
 */
function getRelation (relations: Relations, relationPath: string): string {
    const relationId: string = relationPath.split('/').pop();

    return relations[relationId];
}

export function resolveCSSRelations (code: string, relations: Relations): string {
    cssSourcePattern.lastIndex = 0;

    return code.replace(cssSourcePattern, (_input: string, relationPath: string) => {
        const src: string = getRelation(
            relations,
            relationPath.replace(startQuotesPattern, '').replace(endQuotesPattern, '')
        );

        if (src) {
            return `url("${ src }")`;
        }

        return 'none';
    });
}

export function resolveHTMLRelations (code: string, relations: Relations): string {
    htmlSourcePattern.lastIndex = 0;

    return code.replace(htmlSourcePattern, (_input: string, attributeName: string, relationPath: string) => {
        const src: string = getRelation(relations, relationPath);

        if (src) {
            return `${ attributeName }="${ src }"`;
        }

        return '';
    });
}