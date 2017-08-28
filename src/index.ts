import * as file2html from 'file2html';
import {lookup} from 'file2html/lib/mime';
import {errorsNamespace} from 'file2html/lib/errors';
import {Archive, ArchiveEntry, readArchive} from 'file2html-archive-tools';
import {parseXML} from 'file2html-xml-tools/lib/sax';
import parseCSS from './parse-css';
import {resolveCSSRelations, resolveHTMLRelations} from './relations';

const supportedMimeTypes: string[] = [lookup('.epub')];

export interface Relations {
    [key: string]: string;
}

const pageBodyPattern: RegExp = /<body[^>]*>|<\/body>/;
const pageStylePattern: RegExp = /<style[^>]*>|<\/style>/;
const tagBeginPattern: RegExp = /^\s*</;
const relativeHeightAttributePattern: RegExp = /(height="[0-9]+%?")/g;
const packageFilePathPattern: RegExp = /\.opf$/i;

export default class EPUBReader extends file2html.Reader {
    read ({fileInfo}: file2html.ReaderParams) {
        const {content} = fileInfo;
        const {byteLength} = content;

        return readArchive(content).then((archive: Archive) => {
            const {files} = archive;
            const paths: string[] = Object.keys(files || {});
            const packageFilePath: string = paths.find((path: string) => packageFilePathPattern.test(path));

            function getInvalidFileError () {
                const archiveTree: string = paths.join(',\n');

                return Promise.reject(new Error(
                    `${ errorsNamespace }.invalidFile. Archive: [${ archiveTree }]`
                )) as any;
            }

            if (!packageFilePath) {
                return getInvalidFileError();
            }

            return archive.file(packageFilePath).async('string').then((packageFileContent: string) => {
                const meta: file2html.FileMetaInformation = Object.assign({
                    fileType: file2html.FileTypes.document,
                    mimeType: '',
                    name: '',
                    size: byteLength,
                    creator: '',
                    createdAt: '',
                    modifiedAt: ''
                }, fileInfo.meta);
                let metaProperty: string;
                const mediaFiles: string[] = [];
                const cssFiles: string[] = [];
                const contentFiles: string[] = [];
                const contentRefs: {[key: string]: string} = {};

                parseXML(packageFileContent, {
                    onopentag (tagName: string, attrs: {[key: string]: string}) {
                        switch (tagName) {
                            case 'dc:creator':
                                metaProperty = 'creator';
                                break;
                            case 'dc:date':
                                metaProperty = 'createdAt';
                                break;
                            case 'meta':
                                if (attrs.property === 'dcterms:modified') {
                                    metaProperty = 'modifiedAt';
                                }

                                break;
                            case 'item':
                                const {id, href, 'media-type': mime} = attrs;

                                if (!href || !mime) {
                                    break;
                                }

                                if (
                                    mime.indexOf('application/font') >= 0 ||
                                    mime.indexOf('image/') >= 0
                                ) {
                                    mediaFiles.push(href.split('/').pop());
                                } else if (mime.indexOf('/css') >= 0) {
                                    cssFiles.push(href.split('/').pop());
                                } else if (id && mime.indexOf('application/xhtml') >= 0) {
                                    contentRefs[id] = href.split('/').pop();
                                }
                                break;
                            case 'itemref':
                                const filename: string = contentRefs[attrs.idref];

                                if (filename) {
                                    contentFiles.push(filename);
                                }

                                break;
                            default:
                                //
                        }
                    },

                    ontext (textContent: string) {
                        if (metaProperty && textContent) {
                            meta[metaProperty] = textContent;
                        }
                    },

                    onclosetag () {
                        metaProperty = undefined;
                    }
                }, {
                    xmlMode: true
                });
                const relationsQueue: Promise<void>[] = [];
                const cssQueue: Promise<string>[] = [];
                const contentQueue: Promise<string>[] = [];
                const relations: Relations = {};

                archive.forEach((relativePath: string, fileEntry: ArchiveEntry) => {
                    const filename: string = relativePath.split('/').pop();

                    if (mediaFiles.indexOf(filename) >= 0) {
                        relationsQueue.push(fileEntry.async('base64').then((base64: string) => {
                            relations[filename] = `data:${ lookup(filename) };base64,${ base64 }`;
                        }));
                    } else if (cssFiles.indexOf(filename) >= 0) {
                        cssQueue.push(fileEntry.async('string'));
                    } else if (contentFiles.indexOf(filename) >= 0) {
                        contentQueue.push(fileEntry.async('string'));
                    }
                });

                return Promise.all([
                    Promise.all(relationsQueue) as Promise<any[]>,
                    Promise.all(cssQueue) as Promise<string[]>,
                    Promise.all(contentQueue) as Promise<string[]>
                ]).then(([, cssItems, contentItems]: [void[], string[], string[]]) => {
                    let styles: string = '';
                    let content: string = '';

                    cssItems.forEach((css: string) => styles += `${ parseCSS(css, relations) }\n`);

                    contentItems.forEach((html: string, i: number) => {
                        let htmlWithoutStyles: string = '';

                        html.split(pageStylePattern).forEach((code: string) => {
                            if (tagBeginPattern.test(code)) {
                                htmlWithoutStyles += code;
                            } else {
                                styles += `${ parseCSS(code, relations) }\n`;
                            }
                        });

                        const body: string = htmlWithoutStyles.split(pageBodyPattern)[1];

                        if (!body) {
                            return;
                        }

                        const pageName: string = contentFiles[i];

                        relativeHeightAttributePattern.lastIndex = 0;

                        content += `<div id="${ pageName }">${ resolveCSSRelations(
                            resolveHTMLRelations(
                                body.replace(relativeHeightAttributePattern, 'data-$1'),
                                relations
                            ),
                            relations
                        ) }</div>`;
                    });

                    return new file2html.File({
                        meta,
                        styles: `<style>${ styles }</style>`,
                        content: `<div>${ content }</div>`
                    });
                });
            });
        });
    }

    static testFileMimeType (mimeType: string) {
        return supportedMimeTypes.indexOf(mimeType) >= 0;
    }
}