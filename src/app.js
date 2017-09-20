const fs = require('fs');
const { UPDATER, WEB, ENCRYPTION_KEY } = JSON.parse(fs.readFileSync(__dirname + '../config.json').toString());

// Must be 32 characters
process.env.ENCRYPTION_KEY = ENCRYPTION_KEY;

const updater = require('./updater');
const web = require('./web');

process.on('SIGINT', stopAll);

function stopAll() {
    console.log('Stoping updater service...');
    updater.stop();
    console.log('Updater service stopped !');
    console.log('Stoping web service...');
    web.stop();
    console.log('Web service stopped !');
    console.log('Shutting down, bye !');
    process.exit();
}

function startAll() {
    console.log('Starting updater service...');
    updater.start(UPDATER);
    console.log('Updater service started !');
    console.log('Starting web service...');
    // Launch web
    web.start(WEB);
    console.log('Web service started !');
}

startAll();