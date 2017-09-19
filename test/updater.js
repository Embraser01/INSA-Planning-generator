const should = require('should');

describe('Updater', () => {

    it('Just require() module', () => {
        // Disable timeout because require can be long sometimes
        this.timeout(0);

        require('../src/updater');
    });
});