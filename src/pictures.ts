import {Archive, ArchiveEntry} from 'file2html-archive-tools';
import {lookup} from 'file2html/lib/mime';
import {Relations} from './index';

export const folderName: string = 'images';
export const oebpsFolderName: string = 'data';

export function parsePictures (picturesFolder: Archive, {isOEBPS}: {isOEBPS: boolean}): Promise<Relations> {
    const relations: Relations = {};

    if (!picturesFolder) {
        return Promise.resolve(relations);
    }

    const queue: Promise<void>[] = [];

    picturesFolder.forEach((relativePath: string, fileEntry: ArchiveEntry) => {
        queue.push(fileEntry.async('base64').then((base64: string) => {
            const relationId: string = `${ isOEBPS ? oebpsFolderName : folderName }/${ relativePath }`;

            relations[relationId] = `data:${ lookup(relativePath) };base64,${ base64 }`;
        }));
    });

    return Promise.all(queue).then(() => relations);
}