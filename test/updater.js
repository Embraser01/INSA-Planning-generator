const should = require('should');

describe('Updater', function () {

    it('Just require() module', function () {
        // Disable timeout because require can be long sometimes
        this.timeout(0);

        require('../src/updater');
    });
});