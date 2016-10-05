'use strict';

var crypto = require('crypto');
var fs = require('fs');
var inquirer = require('inquirer');

var config = JSON.parse(fs.readFileSync('./config.dist.json'));
var KEY = randomString(64);
config.KEY = KEY;
var cipher = crypto.createCipher('aes-256-ctr', KEY);

inquirer.prompt([{
    type: 'input',
    name: 'login',
    message: 'Login utilisé ?'
}, {
    type: 'password',
    name: 'password',
    message: 'Mot de passe utilisé ?'
}], function (res) {

    config.password = cipher.update(res.password, 'utf8', 'hex') + cipher.final('hex');
    config.login = res.login;

    var string = JSON.stringify(config, null, 4);
    fs.writeFile('./config.json', string, function (err) {
        if (err) return cb(console.log('Erreur lors de la création de la config :' + err));
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