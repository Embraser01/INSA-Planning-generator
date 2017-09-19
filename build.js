/*
 INSA-Planning-generator  Copyright (C) 2017  Marc-Antoine FERNANDES
 This program comes with ABSOLUTELY NO WARRANTY; for details type `show w'.
 This is free software, and you are welcome to redistribute it
 under certain conditions; type `show c' for details.
 */

'use strict';

const passwordManager = require('./src/password-manager');
const fs = require('fs');
const inquirer = require('inquirer');

// Load config template and generate a new KEY
const config = JSON.parse(fs.readFileSync('./config.dist.json').toString());

const KEY = process.env.ENCRYPTION_KEY = require('crypto').randomBytes(16).toString('hex');

// Ask user for personal informations
inquirer.prompt([
    {
        type: 'input',
        name: 'login',
        message: 'Login utilisé ?'
    }, {
        type: 'password',
        name: 'password',
        message: 'Mot de passe utilisé ?'
    },
    {
        type: 'confirm',
        name: 'ssl',
        message: 'Serveur en HTTPS ?',
        default: false
    },
    {
        type: 'input',
        name: 'sslKey',
        message: 'Chemin de la clé SSL ?',
        when(answers) {
            return answers.ssl;
        }
    },
    {
        type: 'input',
        name: 'sslCert',
        message: 'Chemin du certificat SSL ?',
        when(answers) {
            return answers.ssl;
        }
    },
]).then(res => {

    Object.assign(config, {
        KEY,
        password: passwordManager.encrypt(res.password),
        login: res.login,
        ssl: res.ssl,
        sslKey: res.ssl ? res.sslKey : '',
        sslCert: res.ssl ? res.sslCert : '',
    });


    // Write config file
    const string = JSON.stringify(config, null, 4);
    fs.writeFile('./config.json', string, err => {
        if (err) return console.log('Erreur lors de la création de la config :' + err);
        console.log('La configuration est terminée');
    });
});