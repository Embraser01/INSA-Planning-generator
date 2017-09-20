const express = require('express');
const fs = require('fs');
const { PORT } = require('../api/constants');

const routes = require('./routes');
const webApp = express();

const WEB_CONFIG = {};
let server;

webApp.use('', routes);

/**
 * Start the http server with SSL Configuration if wanted
 */
function startExpressApp() {
    // Create HTTP or HTTPS server.
    if (WEB_CONFIG.ssl) {
        if (!WEB_CONFIG.sslKey || !WEB_CONFIG.sslCert) {
            throw new Error("Cannot start HTTPS server, `sslKey` or `sslCert` is missing in config.js.")
        }

        server = require('https').createServer({
            key: fs.readFileSync(WEB_CONFIG.sslKey),
            cert: fs.readFileSync(WEB_CONFIG.sslCert)
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
        WEB_CONFIG.ssl = !!config.ssl;
        WEB_CONFIG.sslCert = config.sslCert;
        WEB_CONFIG.sslKey = config.sslKey;

        if (!config.port) throw new Error('Field `port` was not provided, please fix your config');
        WEB_CONFIG.port = config.port;

        startExpressApp();
    },

    stop() {
        if (!server) throw new Error('Stop was called before start');
        server.close();
    }
};