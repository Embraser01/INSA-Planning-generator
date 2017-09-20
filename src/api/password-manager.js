const crypto = require('crypto');
const IV_LENGTH = 16; // For AES, this is always 16

module.exports = {

    /**
     * Decrypte un mot de passe en fonction de la clé
     * @param password {String} Mot de passe crypté
     * @returns {String} Mot de passe en clair
     */
    decrypt(password) {
        const textParts = password.split(':');
        const iv = new Buffer(textParts.shift(), 'hex');
        const encryptedPassword = new Buffer(textParts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', new Buffer(process.env.ENCRYPTION_KEY), iv);
        let decrypted = decipher.update(encryptedPassword);

        decrypted = Buffer.concat([decrypted, decipher.final()]);

        return decrypted.toString();
    },

    /**
     * Encrypte un mot de passe en fonction de la clé
     * @param password {String} Mot de passe à crypter
     * @returns {String} Mot de passe crypté
     */
    encrypt(password) {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv('aes-256-cbc', new Buffer(process.env.ENCRYPTION_KEY), iv);
        let encrypted = cipher.update(password);

        encrypted = Buffer.concat([encrypted, cipher.final()]);

        return iv.toString('hex') + ':' + encrypted.toString('hex');
    }
};


