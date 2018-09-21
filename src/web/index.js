const express = require('express');
const fs = require('fs');

const routes = require('./routes');
const webApp = express();

let server;

webApp.use('/', routes);

/**
 * Start the http server with SSL Configuration if wanted
 */
function startExpressApp({ ssl, sslKey, sslCert, port }) {
    // Create HTTP or HTTPS server.
    if (ssl) {
        if (!sslKey || !sslCert) {
            throw new Error("Cannot start HTTPS server, `sslKey` or `sslCert` is missing in config.js.")
        }

        server = require('https').createServer({
            key: fs.readFileSync(sslKey),
            cert: fs.readFileSync(sslCert)
        }, webApp);
    } else {
        server = require('http').createServer(webApp);
    }

    // Listen on provided port, on all network interfaces.
    server.listen(port);
    server.on('error', (error) => {
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
    });
    server.on('listening', () => {
        const addr = server.address();
        const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
        console.log('Listening on ' + bind);
    });
}


module.exports = {
    start(config) {
        if (!config.port) throw new Error('Field `port` was not provided, please fix your config');
        startExpressApp(config);
    },

    stop() {
        if (!server) throw new Error('Stop was called before start');
        server.close();
    }
};
