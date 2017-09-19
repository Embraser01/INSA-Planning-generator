const should = require('should');
const fs = require('fs');
const { format } = require('util');

const exporter = require('../src/exporter');
const { EXPORT_FOLDER, FILE_NAME } = require('../src/constants');

describe('Exporter', () => {

    beforeEach(() => {
        // On crée un dossier s'il n'existe pas
        if (!fs.existsSync(EXPORT_FOLDER + 'tests')) fs.mkdirSync(EXPORT_FOLDER + 'tests');

        fs.writeFileSync(EXPORT_FOLDER + 'tests/' + format(FILE_NAME, 1), 'nodata');
    });

    it('should export to file', () => {
        exporter.savePlannings([
            {
                year: 'tests',
                group: 1,
                events: {
                    mock: 'data'
                },
            },
        ]);

        fs.existsSync(EXPORT_FOLDER + 'tests/' + format(FILE_NAME, 1)).should.be.true();
        fs.readFileSync(EXPORT_FOLDER + 'tests/' + format(FILE_NAME, 1)).toString().should.be.equal('[object Object]');
    });

    it('should not export because empty and file already exists', () => {
        exporter.savePlannings([
            {
                year: 'tests',
                group: 1,
                events: {},
            },
        ]);

        fs.existsSync(EXPORT_FOLDER + 'tests/' + format(FILE_NAME, 1)).should.be.true();
        fs.readFileSync(EXPORT_FOLDER + 'tests/' + format(FILE_NAME, 1)).toString().should.be.equal('nodata');
    });
});