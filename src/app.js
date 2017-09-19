/*
 INSA-Planning-generator  Copyright (C) 2017  Marc-Antoine FERNANDES
 This program comes with ABSOLUTELY NO WARRANTY; for details type `show w'.
 This is free software, and you are welcome to redistribute it
 under certain conditions; type `show c' for details.
 */

const fs = require('fs');
const CONFIG = JSON.parse(fs.readFileSync(__dirname + '../config.json').toString());

// Start updater
const updater = require('./updater');
const web = require('./web');

updater.start({
    login: CONFIG.login,
    password: CONFIG.password,
});

web.start({
    ssl: CONFIG.ssl,
    sslKey: CONFIG.sslKey,
    sslCert: CONFIG.sslCert,
});

// TODO: listen for SIGINT