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


// Modules

let fs = require('fs');
let jsdom = require('jsdom');
let request = require('request').defaults({jar: true});
let moment = require('moment');
let express = require('express');

let utils = require('./src/utils');

let app = express();


// App Specific

const INTERVAL = 6;
const PORT = 8003;
const MAX_DAYS_TO_NOTIFY = 15;
const YEAR = 2016;
const FILE_NAME = 'edt_grp%d.ics';
const EXPORT_FOLDER = './export/';
const CONFIG = JSON.parse(fs.readFileSync('./config.json'));


// INSA Connection Specific

const LOGIN_LINK = 'https://login.insa-lyon.fr/cas/login';
const DEFAULT_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.143 Safari/537.36'
};

// INSA EDT IF Specific

const YEAR_VAR = '$if_year';
const EDT_LINK = 'https://servif-cocktail.insa-lyon.fr/EdT/' + YEAR_VAR + 'IF.php';
const MIDDLE_WEEK = 30;
const REGEX_DATE = /S(\d+)-J(\d)/;
const USE_WORD = "slot";
const NB_MIN_PER_SPAN = 15;
const IF_SECTION = {
    3: [1, 2, 3, 4],
    4: [1, 2, 3, 4],
    5: [1, 2, 3, 4]
};


// Global variables

let cache = {};


//===============//
//===== APP =====//
//===============//


/**
 * Rajoute un évenement à un tableau
 * @param event {Object} Evenement en version HTML
 * @param planning_tab {Array} Liste d'évenements
 */
function addEvent(event, planning_tab) {

    // Si ce n'est pas un cours
    if (!(event.id && event.id.indexOf(USE_WORD) > -1)) return;


    let padding = 0; // Padding des marges de chaque heure
    let day_num = Number(REGEX_DATE.exec(event.id)[2]);
    let week_num = Number(REGEX_DATE.exec(event.id)[1]);
    let year = week_num > MIDDLE_WEEK ? YEAR : YEAR + 1; // Choix de l'année en fonction du numéro de semaine

    // Nombre de minute depuis le début de la journée
    let nb_min = Number(event.childNodes[0].childNodes[0].childNodes[1].childNodes[0].innerHTML.substr(0, 2)) * 60
        + Number(event.childNodes[0].childNodes[0].childNodes[1].childNodes[0].innerHTML.substr(3, 2));


    // Date du début du cours
    let start = utils.getDateOfISOWeek(week_num, year);
    start.setDate(start.getDate() + day_num - 1);
    start.setMinutes(nb_min);


    // Boucle pour prendre en compte les marges non affichées
    for (let i = event.colSpan - 1; i > 0; i--) {
        nb_min += NB_MIN_PER_SPAN;
        if (nb_min % 60 === 0) {
            padding--;
            i--;
        }
    }


    // Date de fin de cours
    let end = new Date(start.getTime());
    end.setMinutes(end.getMinutes() + NB_MIN_PER_SPAN * (Number(event.colSpan) + padding));


    // On ajoute l'évenement au tableau (CHILDNODECEPTION)
    planning_tab.push({
        start: start,
        end: end,
        title: utils.normalize(event.childNodes[0].childNodes[0].childNodes[0].childNodes[0].innerHTML),
        description: utils.normalize(event.childNodes[0].childNodes[0].childNodes[1].childNodes[1].innerHTML),
        location: utils.normalize(event.childNodes[0].childNodes[0].childNodes[1].childNodes[0].innerHTML.slice(6, -1).replace('@', ''))
    });
}

/**
 * Génère un fichier ics depuis un tableau
 * @param planning_tab {Array} tableau d'évenement
 * @param if_year {Number}
 * @param grp_num {Number}
 */
function exportCalendar(planning_tab, if_year, grp_num) {
    let event;

    /*
     On vérifie si un fichier existe déjà, si oui et que le planning est vide, on ne fait rien
     */

    if (planning_tab.length === 0 && fs.existsSync(EXPORT_FOLDER + if_year + '/' + utils.node.format(FILE_NAME, grp_num))) return;


    /*
     Maintenant on va créer un fichier iCal depuis le planning
     */

    let exportData = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//lol/mdr//c_pa_fo//Marc-Antoine F. Exporter v1.0//FR\n';

    for (let i = 0; i < planning_tab.length; i++) {
        event = planning_tab[i];

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
    let i, j;

    /*
     * On instancie une fenêtre JSDOM
     */
    jsdom.env(data, [], function (err, window) {
        if (err) throw err;

        let document = window.document;


        /*
         On enleve tous les h2 (je sais même plus si c'est utile xD )
         */

        let h2s = document.getElementsByTagName("h2");

        for (i = 0; i < h2s.length; i++) h2s[i].parentNode.removeChild(h2s[i]);


        /*
         On recupère les edt par jours
         */

        let weeks = document.querySelectorAll('table.edt') || [];
        let days = [];
        for (i = 0; i < weeks.length; i++)
            days = days.concat(Array.prototype.slice.call(weeks[i].querySelectorAll('.hour')));

        let day = {};
        let nb_days = 0;

        let daysPerGroup = {
            grp1: [],
            grp2: [],
            grp3: [],
            grp4: []
        };
        let planning = {
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

        let event;
        let day_grp_1, day_grp_2, day_grp_3, day_grp_4;


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

                addEvent(event, planning.grp1);

                //noinspection EqualityComparisonWithCoercionJS
                if (event.rowSpan == NB_GROUPS) { // Si c'est un CM, on l'ajoute à tout le monde
                    addEvent(event, planning.grp2);
                    addEvent(event, planning.grp3);
                    addEvent(event, planning.grp4);


                } else {

                    //noinspection EqualityComparisonWithCoercionJS
                    if (event.rowSpan == 2) { // Si c'est avec deux classes (obligé avec l'edt des 4IF)
                        addEvent(event, planning.grp2);
                    }
                }
            }


            /*
             PLANNING SUR UN JOUR DU GROUPE 2
             */

            for (j = 0; j < day_grp_2.childNodes.length; j++) {
                event = day_grp_2.childNodes[j];
                addEvent(event, planning.grp2);
            }


            /*
             PLANNING SUR UN JOUR DU GROUPE 3
             */
            for (j = 0; j < day_grp_3.childNodes.length; j++) {
                event = day_grp_3.childNodes[j];
                addEvent(event, planning.grp3);

                //noinspection EqualityComparisonWithCoercionJS
                if (event.rowSpan == 2) { // Si c'est avec deux classes (obligé avec l'edt des 4IF)
                    addEvent(event, planning.grp4);
                }
            }


            /*
             PLANNING SUR UN JOUR DU GROUPE 4
             */

            for (j = 0; j < day_grp_4.childNodes.length; j++) {
                event = day_grp_4.childNodes[j];
                addEvent(event, planning.grp4);
            }
        }

        /*
         On exporte les calendrier au format iCal
         */

        let errors = [];

        errors.push(exportCalendar(planning.grp1, "export/" + if_year + "/edt_grp1.ics", if_year));
        errors.push(exportCalendar(planning.grp2, "export/" + if_year + "/edt_grp2.ics", if_year));
        errors.push(exportCalendar(planning.grp3, "export/" + if_year + "/edt_grp3.ics", if_year));
        errors.push(exportCalendar(planning.grp4, "export/" + if_year + "/edt_grp4.ics", if_year));

        for (i = 0; i < errors.length; i++) if (errors[i]) console.log("OUTPUT :", errors[i]);

        // On check si des evenenement on changés

        //TODO Detect event change


        // On enregistre dans un cache le planning
        cache[if_year] = planning;

        // Empeche la fuite de mémoire ??
        errors = null;
    });
}

/**
 * Met à jour les tous les emplois du temps
 */
function update() {

    let execution = '';
    let lt = '';
    let i;

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

    for (let i = 0; i < IF_YEARS.length; i++) {
        if (Number(req.params.num_year) === IF_YEARS[i]
            && Number(req.params.num_group) >= 1
            && Number(req.params.num_group) <= 4) {

            return res.sendFile((EXPORT_FOLDER + req.params.num_year + '/' + utils.node.format(FILE_NAME, req.params.num_group));
        }
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