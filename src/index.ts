import * as file2html from 'file2html';
import * as mime from 'file2html/lib/mime';
import {readArchive, Archive, ArchiveEntry} from 'file2html-archive-tools';
import {folderName as picturesFolderName, parsePictures} from './pictures';
import {folderName as fontsFolderName, parseFonts} from './fonts';
import parseCSS from './parse-css';

const supportedMimeTypes: string[] = [mime.lookup('.epub')];

export interface Relations {
    [key: string]: string;
}

const pageBodyBeginPattern: RegExp = /<body[^>]*>/;
const pageBodyEndPattern: RegExp = /<\/body/;
const htmlSourcePattern: RegExp = /src="((images|fonts)\/.+)"/g;

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

            return Promise.all([
                parsePictures(archive.folder(`OPS/${ picturesFolderName }`)),
                parseFonts(archive.folder(`OPS/${ fontsFolderName }`))
            ]).then((relationsGroups: Relations[]) => {
                const relations: Relations = {};
                const queue: Promise<void>[] = [];

                relationsGroups.forEach((rels: Relations) => Object.assign(relations, rels));

                archive.forEach((relativePath: string, file: ArchiveEntry) => {
                    if (relativePath.indexOf('css/') >= 0) {
                        queue.push(parseCSS(file, relations).then((css: string) => {
                            styles += `${ css }\n`;
                        }));
                    } else if (relativePath.indexOf('.xhtml') > 0 && relativePath.indexOf('TOC.xhtml') < 0) {
                        queue.push(file.async('string').then((html: string) => {
                            const pageBodyBeginMatch: RegExpMatchArray = html.match(pageBodyBeginPattern);

                            if (!pageBodyBeginMatch) {
                                return;
                            }

                            const pageBodyEndMatch: RegExpMatchArray = html.match(pageBodyEndPattern);

                            if (!pageBodyEndMatch) {
                                return;
                            }

                            const pageName: string = relativePath.split('/').pop().split('.')[0];

                            content += `<div id="${ pageName }">${ html.slice(
                                pageBodyBeginMatch.index + pageBodyBeginMatch[0].length,
                                pageBodyEndMatch.index
                            ).replace(htmlSourcePattern, (_input: string, ...args: any[]) => {
                                const src: string = relations[args[0]];

                                if (src) {
                                    return `src="${ src }"`;
                                }

                                return '';
                            }) }</div>`;
                        }));
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