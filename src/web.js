
const express = require('express');

// Application

const app = express();

//===============//
//===== WEB =====//
//===============//


app.get('/export/:num_year(\\d+)/:num_group(\\d+)', function (req, res, next) {

    let num_year = Number(req.params.num_year);
    let num_group = Number(req.params.num_group);

    // Si le groupe et l'année existent
    if (IF_SECTION[num_year] && IF_SECTION[num_year][num_group - IF_SECTION[num_year][0]]) {

        return res.sendFile(EXPORT_FOLDER + num_year + '/' + util.node.format(FILE_NAME, num_group));
    }

    next();
});

app.get('/rss/:num_year(\\d+)/:num_group(\\d+)', function (req, res, next) {

    let num_year = Number(req.params.num_year);
    let num_group = Number(req.params.num_group);

    // Si le groupe et l'année existent
    if (IF_SECTION[num_year] && IF_SECTION[num_year][num_group - IF_SECTION[num_year][0]]) {

        return res.send(feeds[num_year][num_group].raw);
    }

    next();
});


// Create HTTP or HTTPS server.
let server;

if (CONFIG.ssl) {
    if (!CONFIG.sslKey || !CONFIG.sslCert) {
        console.error('Cannot start HTTPS server, `sslKey` or `sslCert`' +
            ' is missing in config.js.');
        return;
    }

    server = require('https').createServer({
        key: fs.readFileSync(CONFIG.sslKey),
        cert: fs.readFileSync(CONFIG.sslCert)
    }, app);
} else {
    server = require('http').createServer(app);
}


// Listen on provided port, on all network interfaces.
server.listen(PORT);
server.on('error', onError);
server.on('listening', onListening);


function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }

    let bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

    // Handle specific listen errors with friendly messages.
    switch (error.code) {
        case 'EACCES':
            console.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(bind + ' is already in use');
            process.exit(1);
            break;
        default:
            throw error;
    }
}

// Event listener for HTTP server "listening" event.
function onListening() {
    let addr = server.address();
    let bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
    console.log('Listening on ' + bind);
}
