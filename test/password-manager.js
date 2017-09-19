const should = require('should');
const moment = require('moment');

process.env.ENCRYPTION_KEY = 'YqxKKPm4lYPA2rN7pwBtKQkZBelHsrm6';
const passwordManager = require('../src/password-manager');

const PASSWORD = 'IamAUnicorn';

describe('Password manager module', function () {
    it('should encrypt correctly', function () {
        const encrypted = passwordManager.encrypt(PASSWORD);
        const decrypted = passwordManager.decrypt(encrypted);

        encrypted.should.not.be.equal(PASSWORD);
        decrypted.should.be.equal(PASSWORD);
    });

    it('should not be the same encryption twice', function () {
        const encrypted = passwordManager.encrypt(PASSWORD);
        const encrypted2 = passwordManager.encrypt(PASSWORD);

        encrypted.should.not.be.equal(encrypted2);
    });
});