const should = require('should');
const fs = require('fs');
const { format } = require('util');

const exporter = require('../src/api/exporter');
const { EXPORT_FOLDER, FILE_NAME } = require('../src/api/constants');

describe('Exporter', function () {

    beforeEach(function () {
        // On crée un dossier s'il n'existe pas
        if (!fs.existsSync(EXPORT_FOLDER + 'tests')) fs.mkdirSync(EXPORT_FOLDER + 'tests');

        fs.writeFileSync(EXPORT_FOLDER + 'tests/' + format(FILE_NAME, 1), 'nodata');
    });

    it('should export to file', function () {
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

    it('should not crash if null', function () {
        should.doesNotThrow(() => exporter.savePlannings());
        should.doesNotThrow(() => exporter.savePlannings([undefined, undefined]));
    });

    it('should not export because empty and file already exists', function () {
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