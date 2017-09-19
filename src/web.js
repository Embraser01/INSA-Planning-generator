const express = require('express');
const fs = require('fs');
const { format } = require('util');

const { IF_SECTION, EXPORT_FOLDER, FILE_NAME, PORT } = require('./constants');
const feed = require('./feed');

const webApp = express();
const mainRouter = new express.Router();

let CONFIG = {};
let server;

/**
 * Utility to know if a tuple (year, group) exists
 * @param year {Number} Year (e.g. 4)
 * @param group {Number} Group (e.g. 2)
 * @returns {boolean} true if the group exists
 */
function groupExists(year, group) {
    return !IF_SECTION[year] || IF_SECTION[year].indexOf(group) === -1;
}

/**
 * Route to the ICS File
 */
mainRouter.get('/export/:year(\\d+)/:group(\\d+)', (req, res, next) => {
    const year = +req.params.year;
    const group = +req.params.group;

    if (!groupExists(year, group)) return next();

    return res.sendFile(EXPORT_FOLDER + year + '/' + format(FILE_NAME, group));
});

/**
 * Route for the RSS Feed
 */
mainRouter.get('/rss/:year(\\d+)/:group(\\d+)', (req, res, next) => {
    const year = +req.params.year;
    const group = +req.params.group;

    if (!groupExists(year, group)) return next();

    return res.send(feed.getFeedByYearAndGroup(year, group).raw);
});

webApp.use('', mainRouter);

/**
 * Start the http server with SSL Configuration if wanted
 */
function startExpressApp() {
    // Create HTTP or HTTPS server.
    if (CONFIG.ssl) {
        if (!CONFIG.sslKey || !CONFIG.sslCert) {
            throw new Error("Cannot start HTTPS server, `sslKey` or `sslCert` is missing in config.js.")
        }

        server = require('https').createServer({
            key: fs.readFileSync(CONFIG.sslKey),
            cert: fs.readFileSync(CONFIG.sslCert)
        }, webApp);
    } else {
        server = require('http').createServer(webApp);
    }

    // Listen on provided port, on all network interfaces.
    server.listen(PORT);
    server.on('error', onError);
    server.on('listening', () => {
        const addr = server.address();
        const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
        console.log('Listening on ' + bind);
    });
}

/**
 * Function called when an error is thrown by the http server
 * It can stop the entire process
 * @param error
 */
function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }

    const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

    // Handle specific listen errors with friendly messages.
    switch (error.code) {
        case 'EACCES':
            console.error(`Web app :${bind} requires elevated privileges`);
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(`Web app :${bind} is already in use`);
            process.exit(1);
            break;
        default:
            throw error;
    }
}


module.exports = {
    start(config) {
        CONFIG.ssl = !!config.ssl;
        CONFIG.sslCert = config.sslCert;
        CONFIG.sslKey = config.sslKey;

        startExpressApp();
    },

    stop() {
        server.close();
    }
};