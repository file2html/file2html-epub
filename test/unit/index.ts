import * as fs from 'fs';
import * as path from 'path';
import EPUBReader from '../../src/index';

const validateCss = require('css-validator');

describe('EPUBReader', () => {
    describe('#read()', () => {
        let reader: EPUBReader;

        beforeEach(() => {
            reader = new EPUBReader();
        });

        it('should parse document styles', (done) => {
            reader.read({
                fileInfo: {
                    content: new Uint8Array(fs.readFileSync(path.resolve(__dirname, '../sample.epub'))),
                    meta: {}
                }
            }).then((file) => {
                const {styles} = file.getData();
                const css: string = styles
                    .replace('<style>', '')
                    .replace('</style>', '')
                    .replace(') back', '); back');

                expect(css.length).toBeGreaterThan(0);

                validateCss(css, (error: Error, data: any) => {
                    if (error) {
                        return done(error);
                    }

                    expect(data.errors).toEqual([]);
                    expect(data.validity).toBeTruthy();
                    done();
                });
            }).catch(done);
        });
    });
});