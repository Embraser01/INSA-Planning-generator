/*
 INSA-Planning-generator  Copyright (C) 2017  Marc-Antoine FERNANDES
 This program comes with ABSOLUTELY NO WARRANTY; for details type `show w'.
 This is free software, and you are welcome to redistribute it
 under certain conditions; type `show c' for details.
 */


//=================//
//===== UTILS =====//
//=================//

let crypto = require('crypto');
let util = require('util');

module.exports = {

    node: util,

    /**
     * Renvoi la date en fonction du numero de la semaine et de l'année (http://stackoverflow.com/a/16591175/5285167)
     * @param y année
     * @param w semaine
     * @param d jour de la semaine
     * @returns {Date} date en fonction de l'année et de la semaine
     */
    getDateOfISOWeek: function (y, w, d) {
        let simple = new Date(y, 0, 1 + (w - 1) * 7);
        let dow = simple.getDay();
        let ISOweekStart = simple;
        if (dow <= 4)
            ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
        else
            ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());

        return ISOweekStart;
    },

    /**
     * Rajoute des 0 devant un nombre si besoin
     * @param str {Number | String} nombre à normaliser
     * @param max {Number} Nombre de caractère à avoir à la fin
     * @returns {String} Nombre modifié
     */
    pad: function (str, max) {
        str = str.toString();
        return str.length < max ? module.exports.pad("0" + str, max) : str;
    },

    /**
     * Change les &nbsp; en espace normal
     * @param str {String} Chaîne de caractères
     * @returns {String} Chaîne de caractères modifiée
     */
    normalize: function (str) {
        return str ? str.replace(new RegExp('&nbsp;', 'g'), '') : '';
    },

    /**
     * Decrypte un mot de passe en fonction de la clé
     * @param password {String} Mot de passe crypté
     * @param KEY {String} Clé de cryptage
     * @returns {String} Mot de passe en clair
     */
    decrypt: function (password, KEY) {
        let decipher = crypto.createDecipher('aes-256-ctr', KEY);
        return decipher.update(password, 'hex', 'utf8') + decipher.final('utf8');
    },

    /**
     * Encrypte un mot de passe en fonction de la clé
     * @param password {String} Mot de passe à crypter
     * @param KEY {String} Clé de cryptage
     * @returns {String} Mot de passe crypté
     */
    encrypt: function (password, KEY) {
        let cipher = crypto.createCipher('aes-256-ctr', KEY);
        return cipher.update(password, 'utf8', 'hex') + cipher.final('hex');
    },

    /**
     * Transforme une date au format demandé par VCal
     * @param date {Date}
     * @returns {String}
     */
    getVCalDate: function (date) {
        return ''
            + date.getUTCFullYear()
            + module.exports.pad(date.getUTCMonth() + 1, 2)
            + module.exports.pad(date.getUTCDate(), 2)
            + 'T'
            + module.exports.pad(date.getUTCHours(), 2)
            + module.exports.pad(date.getUTCMinutes(), 2)
            + '00Z';
    },


    /**
     * Crée un string aléatoire
     * @param nb {Number} nombre de caractère
     * @returns {String} la string random
     */
    randomString: function (nb) {
        let text = '';
        let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

        for (let i = 0; i < nb; i++)
            text += possible.charAt(Math.floor(Math.random() * possible.length));

        return text;
    }
};


