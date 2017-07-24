import * as file2html from 'file2html';
export interface Relations {
    [key: string]: string;
}
export default class EPUBReader extends file2html.Reader {
    read({fileInfo}: file2html.ReaderParams): Promise<file2html.File>;
    static testFileMimeType(mimeType: string): boolean;
}
