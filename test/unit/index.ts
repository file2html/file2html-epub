import * as fs from 'fs';
import * as path from 'path';
import {File} from 'file2html';
import EPUBReader from '../../src/index';

const validateCss = require('css-validator');

describe('EPUBReader', () => {
    describe('#read()', () => {
        let file: File;

        beforeAll((done) => {
            new EPUBReader().read({
                fileInfo: {
                    content: new Uint8Array(fs.readFileSync(
                        path.resolve(__dirname, '../sample.epub')
                    )),
                    meta: {}
                }
            }).then((result) => {
                file = result;
                done();
            });
        });

        it('should parse document meta', () => {
            expect(file.getMeta()).toEqual({
                'createdAt': '2013',
                'creator': 'Infogrid Pacific',
                'fileType': 1,
                'mimeType': '',
                'modifiedAt': '2013-06-18T06:46:49Z',
                'name': '',
                'size': 3420618
            });
        });

        it('should parse document content', () => {
            const {content} = file.getData();
            const html: string = content
                .replace(/^<div>/, '')
                .replace(/<\/div>$/, '');

            expect(html.length).toBeGreaterThan(0);
        });

        it('should parse document styles', (done) => {
            const {styles} = file.getData();
            const css: string = styles
                .replace('<style>', '')
                .replace('</style>', '')
                .replace(') back', '); back');

            expect(css.length).toBeGreaterThan(0);

            validateCss({
                text: css,
                profile: 'css3'
            }, (error: Error, data: any) => {
                if (error) {
                    return done(error);
                }

                expect(data.errors).toEqual([]);
                expect(data.validity).toBeTruthy();
                done();
            });
        });
    });
});