const should = require('should');
const moment = require('moment');
const passwordManager = require('../src/password-manager');

describe('Password manager module', () => {
    process.env.ENCRYPTION_KEY = 'YqxKKPm4lYPA2rN7pwBtKQkZBelHsrm6';
    const PASSWORD = 'IamAUnicorn';

    it('should encrypt correctly', () => {
        const encrypted = passwordManager.encrypt(PASSWORD);
        const decrypted = passwordManager.decrypt(encrypted);

        encrypted.should.not.be.equal(PASSWORD);
        decrypted.should.be.equal(PASSWORD);
    });

    it('should not be the same encryption twice', () => {
        const encrypted = passwordManager.encrypt(PASSWORD);
        const encrypted2 = passwordManager.encrypt(PASSWORD);

        encrypted.should.not.be.equal(encrypted2);
    });
});