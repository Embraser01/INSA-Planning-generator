const passwordManager = require('./src/api/password-manager');
const fs = require('fs');
const inquirer = require('inquirer');
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY = require('crypto').randomBytes(16).toString('hex');

// Ask user for personal informations
inquirer.prompt([
    {
        type: 'input',
        name: 'login',
        message: 'Login utilisé ?'
    }, {
        type: 'password',
        name: 'password',
        message: 'Mot de passe utilisé ?',
        filter(pass) {
            return passwordManager.encrypt(pass);
        }
    }, {
        type: 'input',
        name: 'interval',
        message: "Interval d'actualisation (en heures) ?",
        default: 1,
        validate(value) {
            if (!isNaN(value) && value > 0) return true;
            return "L'interval doit être un nombre positif";
        },
        filter(value) {
            return parseFloat(value);
        }
    },
    {
        type: 'input',
        name: 'port',
        message: 'Port du serveur web ?',
        default: 8003,
        validate(value) {
            if (!isNaN(value) && value > 0 && (value | 0) === value) return true;
            return 'Le port doit être un nombre entier positif';
        },
        filter(value) {
            return parseInt(value);
        }
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

    const config = {
        ENCRYPTION_KEY,
        WEB: {
            ssl: res.ssl,
            sslKey: res.sslKey,
            sslCert: res.sslCert,
            port: res.port,
        },
        UPDATER: {
            password: res.password,
            login: res.login,
            interval: res.interval,
        }
    };

    // Write config file
    const string = JSON.stringify(config, null, 4);
    fs.writeFile('./config.json', string, err => {
        if (err) return console.log('Erreur lors de la création de la config :' + err);
        console.log('La configuration est terminée');
    });
}).catch(err => console.log(err));