/*
 INSA-Planning-generator  Copyright (C) 2016  Marc-Antoine FERNANDES
 This program comes with ABSOLUTELY NO WARRANTY; for details type `show w'.
 This is free software, and you are welcome to redistribute it
 under certain conditions; type `show c' for details.
 */

// TODO Passer en ES6 c'est pas beau ES5

//=================================//
//===== VARIABLES & CONSTANTS =====//
//=================================//

var crypto = require('crypto');
var fs = require('fs');
var jsdom = require('jsdom');
var request = require('request').defaults({jar: true});
var moment = require('moment');
var express = require('express');

var app = express();

var MIDDLE_WEEK = 30;
var YEAR = 2016;
var REGEX_DATE = /S(\d+)-J(\d)/;
var USE_WORD = "slot";
var NB_MIN_PER_SPAN = 15;
var NB_GROUPS = 4;

var IF_YEARS = [3, 4, 5];
var CONFIG = JSON.parse(fs.readFileSync('./config.json'));
var YEAR_VAR = '$if_year';
var LOGIN_LINK = 'https://login.insa-lyon.fr/cas/login';
var EDT_LINK = 'https://servif-cocktail.insa-lyon.fr/EdT/' + YEAR_VAR + 'IF.php';
var INTERVAL = 6;
var PORT = 8003;
var DEFAULT_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.143 Safari/537.36'
};


//=================//
//===== UTILS =====//
//=================//


/**
 * Renvoi la date en fonction du numero de la semaine et de l'année (http://stackoverflow.com/a/16591175/5285167)
 * @param w semaine
 * @param y année
 * @returns {Date} date en fonction de l'année et de la semaine
 */
function getDateOfISOWeek(w, y) {
    var simple = new Date(y, 0, 1 + (w - 1) * 7);
    var dow = simple.getDay();
    var ISOweekStart = simple;
    if (dow <= 4)
        ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    else
        ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    return ISOweekStart;
}

/**
 * Rajoute des 0 devant un nombre si besoin
 * @param str {Number | String} nombre à normaliser
 * @param max {Number} Nombre de caractère à avoir à la fin
 * @returns {String} Nombre modifié
 */
function pad(str, max) {
    str = str.toString();
    return str.length < max ? pad("0" + str, max) : str;
}

/**
 * Change les &nbsp; en espace normal
 * @param str {String} Chaîne de caractères
 * @returns {String} Chaîne de caractères modifiée
 */
function normalize(str) {
    return str ? str.replace(new RegExp('&nbsp;', 'g'), '') : '';
}

/**
 * Decrypte un mot de passe en fonction de la clé dans la config
 * @param password {String} Mot de passe crypté
 * @returns {String} Mot de passe en clair
 */
function decrypt(password) {
    var decipher = crypto.createDecipher('aes-256-ctr', CONFIG.KEY);
    return decipher.update(password, 'hex', 'utf8') + decipher.final('utf8');
}

/**
 * Transforme une date au format demandé par VCal
 * @param date {Date}
 * @returns {String}
 */
function getVCalDate(date) {
    return ''
        + date.getUTCFullYear()
        + pad(date.getUTCMonth() + 1, 2)
        + pad(date.getUTCDate(), 2)
        + 'T'
        + pad(date.getUTCHours(), 2)
        + pad(date.getUTCMinutes(), 2)
        + '00Z';
}


//===============//
//===== APP =====//
//===============//


/**
 * Rajoute un évenement à un tableau
 * @param event {Object} Evenement en version HTML
 * @param planning_tab {Array} Liste d'évenements
 */
function getEvent(event, planning_tab) {

    // Si ce n'est pas un cours
    if (!(event.id && event.id.indexOf(USE_WORD) > -1)) return;


    var padding = 0; // Padding des marges de chaque heure
    var day_num = Number(REGEX_DATE.exec(event.id)[2]);
    var week_num = Number(REGEX_DATE.exec(event.id)[1]);
    var year = week_num > MIDDLE_WEEK ? YEAR : YEAR + 1; // Choix de l'année en fonction du numéro de semaine

    // Nombre de minute depuis le début de la journée
    var nb_min = Number(event.childNodes[0].childNodes[0].childNodes[1].childNodes[0].innerHTML.substr(0, 2)) * 60
        + Number(event.childNodes[0].childNodes[0].childNodes[1].childNodes[0].innerHTML.substr(3, 2));


    // Date du début du cours
    var start = getDateOfISOWeek(week_num, year);
    start.setDate(start.getDate() + day_num - 1);
    start.setMinutes(nb_min);


    // Boucle pour prendre en compte les marges non affichées
    for (var i = event.colSpan - 1; i > 0; i--) {
        nb_min += NB_MIN_PER_SPAN;
        if (nb_min % 60 === 0) {
            padding--;
            i--;
        }
    }


    // Date de fin de cours
    var end = new Date(start.getTime());
    end.setMinutes(end.getMinutes() + NB_MIN_PER_SPAN * (Number(event.colSpan) + padding));


    // On ajoute l'évenement au tableau (CHILDNODECEPTION)
    planning_tab.push({
        start: start,
        end: end,
        title: normalize(event.childNodes[0].childNodes[0].childNodes[0].childNodes[0].innerHTML),
        description: normalize(event.childNodes[0].childNodes[0].childNodes[1].childNodes[1].innerHTML),
        location: normalize(event.childNodes[0].childNodes[0].childNodes[1].childNodes[0].innerHTML.slice(6, -1).replace('@', ''))
    });
}

/**
 * Génère un fichier ics
 * @param planning_tab {Array} tableau d'évenement
 * @param file {String} nom du fichier
 * @param if_year {Number}
 */
function exportCalendar(planning_tab, file, if_year) {
    var event;

    /*
     On vérifie si un fichier existe déjà, si oui et que le planning est vide, on ne fait rien
     */

    if (planning_tab.length == 0 && fs.existsSync(file)) return;


    /*
     Maintenant on va créer un fichier iCal depuis le planning
     */

    var exportData = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//lol/mdr//c_pa_fo//Marc-Antoine F. Exporter v1.0//FR\n';

    for (var i = 0; i < planning_tab.length; i++) {
        event = planning_tab[i];

        exportData += 'BEGIN:VEVENT\n';
        exportData += 'DTSTART:' + getVCalDate(event.start) + '\n';
        exportData += 'DTEND:' + getVCalDate(event.end) + '\n';
        exportData += 'SUMMARY:' + event.title + '\n';
        exportData += 'LOCATION:' + event.location + '\n';
        exportData += 'DESCRIPTION:' + event.description + ' (exporté le ' + moment().format('DD/MM/YYYY') + ')\n'; // Nom du prof
        exportData += 'END:VEVENT\n';
    }

    exportData += 'END:VCALENDAR';


    if (!fs.existsSync('./export/' + if_year)) fs.mkdirSync('./export/' + if_year);

    return fs.writeFileSync(file, exportData);
}

/**
 * Parse le document HTML pour récupérer à la fin un .ics
 * @param data {String} fichier html
 * @param if_year {Number} Numéro de l'année
 */
function parse(data, if_year) {
    var i, j;

    /*
     * On instancie une fenêtre JSDOM
     */
    jsdom.env(data, [], function (err, window) {
        if (err) throw err;

        var document = window.document;


        /*
         On enleve tous les h2 (je sais même plus si c'est utile xD )
         */

        var h2s = document.getElementsByTagName("h2");

        for (i = 0; i < h2s.length; i++) h2s[i].parentNode.removeChild(h2s[i]);


        /*
         On recupère les edt par jours
         */

        var weeks = document.querySelectorAll('table.edt') || [];
        var days = [];
        for (i = 0; i < weeks.length; i++)
            days = days.concat(Array.prototype.slice.call(weeks[i].querySelectorAll('.hour')));

        var day = {};
        var nb_days = 0;

        var daysPerGroup = {
            grp1: [],
            grp2: [],
            grp3: [],
            grp4: []
        };
        var planning = {
            grp1: [],
            grp2: [],
            grp3: [],
            grp4: []
        };

        for (i = 0; i < days.length; i++) {
            day = days[i];

            for (j = 0; j < day.childNodes.length;) { // On enlève les TH, les séparateurs
                if (day.childNodes[j].tagName !== "TD" || day.childNodes[j].className === "week-separator") {
                    day.removeChild(day.childNodes[j]);
                } else {
                    j++;
                }
            }
            if (day.className && day.className.indexOf("row-group-1") !== -1) {
                daysPerGroup.grp1.push(day);
                nb_days++;
            } else if (day.className && day.className.indexOf("row-group-2") !== -1) {
                daysPerGroup.grp2.push(day);
                nb_days++;
            } else if (day.className && day.className.indexOf("row-group-3") !== -1) {
                daysPerGroup.grp3.push(day);
                nb_days++;
            } else if (day.className && day.className.indexOf("row-group-4") !== -1) {
                daysPerGroup.grp4.push(day);
                nb_days++;
            }
        }

        // On divise  par le nombre de groupe
        nb_days /= NB_GROUPS;

        /*
         Maintenant on recupère chaque cours en fonction du groupe
         */

        var event;
        var day_grp_1, day_grp_2, day_grp_3, day_grp_4;


        for (i = 0; i < nb_days; i++) {
            day_grp_1 = daysPerGroup.grp1[i];
            day_grp_2 = daysPerGroup.grp2[i];
            day_grp_3 = daysPerGroup.grp3[i];
            day_grp_4 = daysPerGroup.grp4[i];


            /*
             PLANNING SUR UN JOUR DU GROUPE 1 + CM
             */

            for (j = 0; j < day_grp_1.childNodes.length; j++) {
                event = day_grp_1.childNodes[j];

                getEvent(event, planning.grp1);

                if (event.rowSpan == NB_GROUPS) { // Si c'est un CM, on l'ajoute à tout le monde
                    getEvent(event, planning.grp2);
                    getEvent(event, planning.grp3);
                    getEvent(event, planning.grp4);
                } else if (event.rowSpan == 2) { // Si c'est avec deux classes (obligé avec l'edt des 4IF)
                    getEvent(event, planning.grp2);
                }
            }


            /*
             PLANNING SUR UN JOUR DU GROUPE 2
             */

            for (j = 0; j < day_grp_2.childNodes.length; j++) {
                event = day_grp_2.childNodes[j];
                getEvent(event, planning.grp2);
            }


            /*
             PLANNING SUR UN JOUR DU GROUPE 3
             */
            for (j = 0; j < day_grp_3.childNodes.length; j++) {
                event = day_grp_3.childNodes[j];
                getEvent(event, planning.grp3);

                if (event.rowSpan == 2) { // Si c'est avec deux classes (obligé avec l'edt des 4IF)
                    getEvent(event, planning.grp4);
                }
            }


            /*
             PLANNING SUR UN JOUR DU GROUPE 4
             */

            for (j = 0; j < day_grp_4.childNodes.length; j++) {
                event = day_grp_4.childNodes[j];
                getEvent(event, planning.grp4);
            }
        }

        /*
         On exporte les calendrier au format iCal
         */

        var errors = [];

        errors.push(exportCalendar(planning.grp1, "export/" + if_year + "/edt_grp1.ics", if_year));
        errors.push(exportCalendar(planning.grp2, "export/" + if_year + "/edt_grp2.ics", if_year));
        errors.push(exportCalendar(planning.grp3, "export/" + if_year + "/edt_grp3.ics", if_year));
        errors.push(exportCalendar(planning.grp4, "export/" + if_year + "/edt_grp4.ics", if_year));

        for (i = 0; i < errors.length; i++) if (errors[i]) console.log("OUTPUT :", errors[i]);

        // Empeche la fuite de mémoire ??
        planning = null;
        errors = null;
    });
}

/**
 * Met à jour les tous les emplois du temps
 */
function update() {

    var execution = '';
    var lt = '';
    var i;

    /*
     On récupère la page de login pour récupérer les variables "execution" & "lt" (sécurité)
     */
    jsdom.env(LOGIN_LINK, [], function (err, window) {
            if (err) return console.log(err);

            execution = window.document.querySelectorAll('input[name="execution"]')[0].value;
            lt = window.document.querySelectorAll('input[name="lt"]')[0].value;

            /*
             Maintenant on se connecte (représenté par le cookie "AGIMUS")
             */
            request.post(LOGIN_LINK, {
                form: {
                    username: CONFIG.login,
                    password: decrypt(CONFIG.password),
                    lt: lt,
                    execution: execution,
                    _eventId: 'submit'
                },
                headers: DEFAULT_HEADERS
            }, function (err) {
                if (err) return console.log(err);

                /**
                 * Fonction pour faire la requête vers l'emploi du temps en fonction de l'année
                 * @param if_year
                 */
                function responseParser(if_year) {
                    request({
                        url: EDT_LINK.replace(YEAR_VAR, '' + IF_YEARS[if_year]),
                        headers: DEFAULT_HEADERS
                    }, function (err, res, body) {
                        if (err) return console.log(err);
                        parse(body, IF_YEARS[if_year]);
                    });
                }

                // Pour chaque années, on fabrique les calendriers de chaque groupes
                for (i = 0; i < IF_YEARS.length; i++) responseParser(i);
            });
        }
    );
}

// On lance le système pour actualiser toutes les INTERVAL heures
setInterval(update, INTERVAL * 60 * 60 * 1000); // En heure

update();


//===============//
//===== WEB =====//
//===============//


app.get('/export/:num_year/:num_group', function (req, res, next) {

    for (var i = 0; i < IF_YEARS.length; i++) {
        if (Number(req.params.num_year) === IF_YEARS[i]
            && Number(req.params.num_group) >= 1
            && Number(req.params.num_group) <= 4) {

            return res.sendFile(__dirname + '/export/' + req.params.num_year + '/edt_grp' + req.params.num_group + '.ics');
        }
    }
    next();
});


// Create HTTP or HTTPS server.
var server;

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

    var bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

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
    var addr = server.address();
    var bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
    console.log('Listening on ' + bind);
}