/*
 INSA-Planning-generator  Copyright (C) 2016  Marc-Antoine FERNANDES
 This program comes with ABSOLUTELY NO WARRANTY; for details type `show w'.
 This is free software, and you are welcome to redistribute it
 under certain conditions; type `show c' for details.
 */

'use strict';

var utils = require('./src/utils');
var fs = require('fs');
var inquirer = require('inquirer');


// Load config template and generate a new KEY

var config = JSON.parse(fs.readFileSync('./config.dist.json'));
var KEY = utils.randomString(64);
config.KEY = KEY;

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
    config.password = utils.encrypt(res.password, KEY);
    config.login = res.login;

    // Write config file
    var string = JSON.stringify(config, null, 4);
    fs.writeFile('./config.json', string, function (err) {
        if (err) return console.log('Erreur lors de la création de la config :' + err);
        console.log('La configuration est terminée');
    });
});