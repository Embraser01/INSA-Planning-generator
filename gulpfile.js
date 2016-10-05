'use strict';

var crypto = require('crypto');
var gulp = require('gulp');
var prompt = require('gulp-prompt');
var gutil = require('gulp-util');
var fs = require('fs');


gulp.task('build', [], function(cb) {

    var config = JSON.parse(fs.readFileSync('./config.dist.json'));

    var KEY = randomString(64);
    config.KEY = KEY;
    var cipher = crypto.createCipher('aes-256-ctr', KEY);

    prompt.prompt({
        type: 'password',
        name: 'pass',
        message: 'Mot de passe utilisé ?'
    }, function(res){
        config.password = cipher.update(res.pass, 'utf8', 'hex') + cipher.final('hex');

        prompt.prompt({
            type: 'input',
            name: 'login',
            message: 'Login utilisé ?'
        }, function(res){
            config.login = res.login;

            var string = JSON.stringify(config, null, 4);
            fs.writeFile('./config.json', string, function(err) {
                if (err) {
                    return cb(gutil.log('Erreur lors de la création de la config :' + err));
                }
                cb();
            });
        });
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