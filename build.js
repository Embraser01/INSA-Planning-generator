/*
 INSA-Planning-generator  Copyright (C) 2016  Marc-Antoine FERNANDES
 This program comes with ABSOLUTELY NO WARRANTY; for details type `show w'.
 This is free software, and you are welcome to redistribute it
 under certain conditions; type `show c' for details.
 */

'use strict';

var crypto = require('crypto');
var fs = require('fs');
var inquirer = require('inquirer');


// Load config template and generate a new KEY

var config = JSON.parse(fs.readFileSync('./config.dist.json'));
var KEY = randomString(64);
config.KEY = KEY;

// Load cipher for future use
var cipher = crypto.createCipher('aes-256-ctr', KEY);


// Ask user for personal informations
inquirer.prompt([{
    type: 'input',
    name: 'login',
    message: 'Login utilisé ?'
}, {
    type: 'password',
    name: 'password',
    message: 'Mot de passe utilisé ?'
}], function (res) {

    // Crypt Password
    config.password = cipher.update(res.password, 'utf8', 'hex') + cipher.final('hex');
    config.login = res.login;

    // Write config file
    var string = JSON.stringify(config, null, 4);
    fs.writeFile('./config.json', string, function (err) {
        if (err) return console.log('Erreur lors de la création de la config :' + err);
        console.log('La configuration est terminée');
    });
});

/*===== UTILS =====*/

function randomString(nb) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (var i = 0; i < nb; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}