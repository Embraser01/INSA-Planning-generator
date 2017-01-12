/*
 INSA-Planning-generator  Copyright (C) 2016  Marc-Antoine FERNANDES
 This program comes with ABSOLUTELY NO WARRANTY; for details type `show w'.
 This is free software, and you are welcome to redistribute it
 under certain conditions; type `show c' for details.
 */

//=================================//
//===== VARIABLES & CONSTANTS =====//
//=================================//


// Modules

let fs = require('fs');
let jsdom = require('jsdom');
let request = require('request').defaults({jar: true});
let moment = require('moment');
let express = require('express');
let Feed = require('feed');

let utils = require('./utils');

let app = express();


// App Specific

const INTERVAL = 6;
const PORT = 8003;
const MAX_DAYS_TO_NOTIFY = 15;
const YEAR = 2016;
const FILE_NAME = 'edt_grp%d.ics';
const EXPORT_FOLDER = '../export/';
const CONFIG = JSON.parse(fs.readFileSync('../config.json'));


// INSA Connection Specific

const LOGIN_LINK = 'https://login.insa-lyon.fr/cas/login';
const DEFAULT_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.143 Safari/537.36'
};

// INSA EDT IF Specific

const EVENT_SELECTOR = 'td[id^=slot]';
const YEAR_VAR = '$if_year';
const EDT_LINK = 'https://servif-cocktail.insa-lyon.fr/EdT/' + YEAR_VAR + 'IF.php';
const MIDDLE_WEEK = 30;
const REGEX_DATE = /S(\d+)-J(\d)/;
const REGEX_CLASSNAME = /row-group-(\d+)/;
const NB_MIN_PER_SPAN = 15;

const IF_SECTION = {
    3: [1, 2, 3, 4],
    4: [1, 2, 3, 4],
    5: [1, 2, 3, 4]
};


// Global variables

let planning = {};
let cache = {};
let feeds = {};

// Init feeds & planning
for (let if_year in IF_SECTION) {
    feeds[if_year] = {};
    planning[if_year] = {};
    for (let grp of IF_SECTION[if_year]) {
        feeds[if_year][grp] = "";
    }
}


//===============//
//===== APP =====//
//===============//


/**
 * Rajoute un évenement à un tableau
 * @param event {Object} Evenement en version HTML
 */
function getEvent(event) {
    let i;

    let detailsElement = event.childNodes[0].childNodes[0].childNodes[1];

    let start_group = Number(REGEX_CLASSNAME.exec(event.parentNode.className)[0]);
    let end_group = start_group + Number(event.rowSpan);

    let padding = 0; // Padding des marges de chaque heure
    let day_num = Number(REGEX_DATE.exec(event.id)[2]);
    let week_num = Number(REGEX_DATE.exec(event.id)[1]);
    let year = week_num > MIDDLE_WEEK ? YEAR : YEAR + 1; // Choix de l'année en fonction du numéro de semaine

    // Nombre de minute depuis le début de la journée
    let nb_min = Number(detailsElement.childNodes[0].innerHTML.substr(0, 2)) * 60
        + Number(detailsElement.childNodes[0].innerHTML.substr(3, 2));


    // Date du début du cours
    let start = utils.getDateOfISOWeek(week_num, year);
    start.setDate(start.getDate() + day_num - 1);
    start.setMinutes(nb_min);


    // Boucle pour prendre en compte les marges non affichées
    for (i = event.colSpan - 1; i > 0; i--) {
        nb_min += NB_MIN_PER_SPAN;
        if (nb_min % 60 === 0) {
            padding--;
            i--;
        }
    }


    // Date de fin de cours
    let end = new Date(start.getTime());
    end.setMinutes(end.getMinutes() + NB_MIN_PER_SPAN * (Number(event.colSpan) + padding));


    // On recuppère les groupes affectés

    let groups = [];

    for (i = start_group; i < end_group; i++) groups.push(i);


    // On renvoie un evennement propre
    return {
        start: start,
        end: end,
        title: utils.normalize(event.childNodes[0].childNodes[0].childNodes[0].childNodes[0].innerHTML),
        description: utils.normalize(detailsElement.childNodes[1].innerHTML),
        location: utils.normalize(detailsElement.childNodes[0].innerHTML.slice(6, -1).replace('@', '')),
        groups: groups
    };
}

/**
 * Génère un fichier ics depuis un objet
 * @param grp_planning_obj {Object} objet (map) d'évenement
 * @param if_year {Number}
 * @param grp_num {Number}
 */
function exportCalendar(grp_planning_obj, if_year, grp_num) {

    /*
     On vérifie si un fichier existe déjà, si oui et que le planning est vide, on ne fait rien
     */

    if (!grp_planning_obj && fs.existsSync(EXPORT_FOLDER + if_year + '/' + utils.node.format(FILE_NAME, grp_num))) return;


    /*
     Maintenant on va créer un fichier iCal depuis le planning
     */

    let exportData = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//lol/mdr//c_pa_fo//Marc-Antoine F. Exporter v1.0//FR\n';

    for (let event in grp_planning_obj) {

        exportData += 'BEGIN:VEVENT\n';
        exportData += 'DTSTART:' + utils.getVCalDate(event.start) + '\n';
        exportData += 'DTEND:' + utils.getVCalDate(event.end) + '\n';
        exportData += 'SUMMARY:' + event.title + '\n';
        exportData += 'LOCATION:' + event.location + '\n';
        exportData += 'DESCRIPTION:' + event.description + ' (exporté le ' + moment().format('DD/MM/YYYY') + ')\n'; // Nom du prof
        exportData += 'END:VEVENT\n';
    }

    exportData += 'END:VCALENDAR';


    if (!fs.existsSync(EXPORT_FOLDER + if_year)) fs.mkdirSync(EXPORT_FOLDER + if_year);

    return fs.writeFileSync(EXPORT_FOLDER + if_year + '/' + utils.node.format(FILE_NAME, grp_num), exportData);
}


function compare(cache, planning) {
    if (!cache || cache.length === 0) return [];

    let iCache = 0;
    let iPlanning = 0;

    let now = new Date();
    let max = new Date();
    max.setDate(max.getDate() + MAX_DAYS_TO_NOTIFY);

    let messages = [];

    while (iCache < cache.length && cache[iCache].start < now) iCache++;
    while (iPlanning < planning.length && planning[iPlanning].start < now) iPlanning++;

    while (iPlanning < planning.length) {
        // Check only until MAX DAY TO NOTIFY
        if (planning[iPlanning].start > max) break;


        // Suppression
        if (planning[iPlanning].start >= cache[iCache].end) {
            messages.push("Le cours suivant du " + moment(cache[iCache].start).format('DD/MM HH:MM') + " a été supprimé ou déplacé : " + cache[iCache].title);
            iCache++;


            // Remplacer
        } else if (planning[iPlanning].start === cache[iCache].start && planning[iPlanning].title !== cache[iCache].title) {
            messages.push("Le cours suivant du " + moment(cache[iCache].start).format('DD/MM HH:MM') + " a été remplacé : " + cache[iCache].title);
            iPlanning++;
            iCache++;


            // Ajouter
        } else if (planning[iPlanning].end <= cache[iCache].start) {
            messages.push("Le cours suivant du " + moment(planning[iPlanning].start).format('DD/MM HH:MM') + " a été ajouté : " + planning[iPlanning].title);
            iPlanning++;


            // Modifier
        } else if (planning[iPlanning].start === cache[iCache].start
            && planning[iPlanning].title === cache[iCache].title
            && (planning[iPlanning].location !== cache[iCache].location || planning[iPlanning].end !== cache[iCache].end)
        ) {
            messages.push("Le cours suivant du " + moment(cache[iCache].start).format('DD/MM HH:MM') + " a été modifié : " + planning[iPlanning].title);
            iPlanning++;
            iCache++;
        }
    }

    return messages;
}


/**
 * Parse le document HTML pour récupérer à la fin un .ics
 * @param data {String} fichier html
 * @param if_year {Number} Numéro de l'année
 */
function parse(data, if_year) {
    let grp, event;

    /*
     * On instancie une fenêtre JSDOM
     */
    jsdom.env(data, [], function (err, window) {
        if (err) throw err;

        let document = window.document;

        /*
         On initialise les plannings de if_year
         */

        for (grp of IF_SECTION[if_year]) {
            planning[if_year][grp] = {};
        }

        /*
         On récupère tous les evenements (querySelectorAll) et on les transforme en objet qu'on enregistre
         */

        let events = document.querySelectorAll(EVENT_SELECTOR);
        let eventObject;

        for (event of events) {
            eventObject = getEvent(event);

            if (eventObject) {
                for (grp of eventObject.groups) {
                    planning[if_year][grp][eventObject.start.getTime()] = eventObject;
                }
            }
        }


        /*
         Maintenant, on peut exporté le planning pour chaque groupe
         */

        let error;
        for (grp of IF_SECTION[if_year]) {
            error = exportCalendar(planning[if_year][grp], if_year, grp);

            if (error) console.log("Erreur lors de l'enregistrement du planning %dIF-GRP%d :", if_year, grp, error);
        }

        // On check si des evenenement on changés

        //TODO Detect event change


        // On enregistre dans un cache le planning
        cache[if_year] = planning;
    });
}

/**
 * Met à jour les tous les emplois du temps
 */
function update() {

    let execution = '';
    let lt = '';

    /*
     On récupère la page de login pour récupérer les letiables "execution" & "lt" (sécurité)
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
                    password: utils.decrypt(CONFIG.password, CONFIG.KEY),
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
                        url: EDT_LINK.replace(YEAR_VAR, '' + if_year),
                        headers: DEFAULT_HEADERS
                    }, function (err, res, body) {
                        if (err) return console.log(err);
                        parse(body, if_year);
                    });
                }

                // Pour chaque années, on fabrique les calendriers de chaque groupes
                for (let i in IF_SECTION) responseParser(i);
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

    // Si le groupe et l'année existent
    if (IF_SECTION[req.params.num_year] && IF_SECTION[req.params.num_year][req.params.num_group]) {

        return res.sendFile((EXPORT_FOLDER + req.params.num_year + '/' + utils.node.format(FILE_NAME, req.params.num_group)));
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