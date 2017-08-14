import * as file2html from 'file2html';
import * as mime from 'file2html/lib/mime';
import {Archive, ArchiveEntry, readArchive} from 'file2html-archive-tools';
import {folderName as picturesFolderName, oebpsFolderName as oebpsPicturesFolderName, parsePictures} from './pictures';
import {folderName as fontsFolderName, parseFonts} from './fonts';
import parseCSS from './parse-css';
import {resolveCSSRelations, resolveHTMLRelations} from './relations';

const supportedMimeTypes: string[] = [mime.lookup('.epub')];

export interface Relations {
    [key: string]: string;
}

const pageBodyPattern: RegExp = /<body[^>]*>|<\/body>/;
const pageStylePattern: RegExp = /<style[^>]*>|<\/style>/;
const relativeHeightAttributePattern: RegExp = /(height="[0-9]+%?")/g;

export default class EPUBReader extends file2html.Reader {
    read ({fileInfo}: file2html.ReaderParams) {
        const {content} = fileInfo;
        const {byteLength} = content;

        return readArchive(content).then((archive: Archive) => {
            const meta: file2html.FileMetaInformation = Object.assign({
                fileType: file2html.FileTypes.document,
                mimeType: '',
                name: '',
                size: byteLength,
                creator: '',
                createdAt: '',
                modifiedAt: ''
            }, fileInfo.meta);
            let styles: string = '';
            let content: string = '';
            let isOEBPS: boolean = false;
            let isOPS: boolean = false;
            const {files} = archive;

            for (const filename in files) {
                if (files.hasOwnProperty(filename)) {
                    if (filename.indexOf('OEBPS/') >= 0) {
                        isOEBPS = true;
                        break;
                    }

                    if (filename.indexOf('OPS/') >= 0) {
                        isOPS = true;
                        break;
                    }
                }
            }

            if (!isOEBPS && !isOPS) {
                const archiveTree: string = Object.keys(archive).join(',\n');

                return Promise.reject(new Error(`Invalid file format. Archive: [${ archiveTree }]`)) as any;
            }

            const picturesFolder: Archive = archive.folder(
                isOEBPS ? `OEBPS/${ oebpsPicturesFolderName }` : `OPS/${ picturesFolderName }`
            );

            return Promise.all([
                parsePictures(picturesFolder, {isOEBPS}),
                isOEBPS ? {} : parseFonts(archive.folder(`OPS/${ fontsFolderName }`))
            ]).then((relationsGroups: Relations[]) => {
                const relations: Relations = {};
                const queue: Promise<void>[] = [];

                relationsGroups.forEach((rels: Relations) => Object.assign(relations, rels));

                archive.forEach((relativePath: string, file: ArchiveEntry) => {
                    if (relativePath.indexOf('css/') >= 0) {
                        queue.push(file.async('string').then((css: string) => {
                            styles += `${ parseCSS(css, relations) }\n`;
                        }));
                    } else {
                        const isXHTMLContentFile: boolean = (
                            relativePath.indexOf('.xhtml') > 0 && relativePath.indexOf('TOC.xhtml') < 0
                        );
                        const isPageFile: boolean = isOEBPS ? (
                            relativePath.indexOf('content/') >= 0 && (
                                relativePath.indexOf('.xml') > 0 || isXHTMLContentFile
                            )
                        ) : isXHTMLContentFile;

                        if (isPageFile) {
                            queue.push(file.async('string').then((html: string) => {
                                let htmlWithoutStyles: string = '';

                                html.split(pageStylePattern).forEach((code: string) => {
                                    if (code[0] === '<') {
                                        htmlWithoutStyles += code;
                                    } else {
                                        styles += `${ parseCSS(code, relations) }\n`;
                                    }
                                });

                                const body: string = htmlWithoutStyles.split(pageBodyPattern)[1];

                                if (!body) {
                                    return;
                                }

                                const pageName: string = relativePath.split('/').pop().split('.')[0];

                                relativeHeightAttributePattern.lastIndex = 0;

                                content += `<div id="${ pageName }">${ resolveCSSRelations(
                                    resolveHTMLRelations(
                                        body.replace(relativeHeightAttributePattern, 'data-$1'),
                                        relations
                                    ),
                                    relations
                                ) }</div>`;
                            }));
                        }
                    }
                });

                return Promise.all(queue).then(() => new file2html.File({
                    meta,
                    styles: `<style>${ styles }</style>`,
                    content: `<div>${ content }</div>`
                }));
            });
        });
    }

    static testFileMimeType (mimeType: string) {
        return supportedMimeTypes.indexOf(mimeType) >= 0;
    }
}