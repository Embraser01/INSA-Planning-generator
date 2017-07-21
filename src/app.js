/*
 INSA-Planning-generator  Copyright (C) 2017  Marc-Antoine FERNANDES
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
let path = require('path');
let Feed = require('feed');

let utils = require('./utils');

let app = express();


// App Specific

const INTERVAL = 1;
const PORT = 8003;
const MAX_DAYS_TO_NOTIFY = 15;
const MAX_FEED_SIZE = 30;
const YEAR = 2017;
const FILE_NAME = 'edt_grp%d.ics';
const FEED_DATE_FORMAT = 'DD/MM à HH:mm';
const EXPORT_FOLDER = path.normalize(__dirname + '/../export/');
const CONFIG = JSON.parse(fs.readFileSync('./config.json'));


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
    cache[if_year] = {};
    planning[if_year] = {};
    for (let grp of IF_SECTION[if_year]) {

        let feed = new Feed({
            title: utils.node.format('Emploi du temps %dIF-Grp.%d', if_year, grp),
            description: utils.node.format('Feed permettant de notifier des changements d\'emploi du temps sur les %d prochains jours', MAX_DAYS_TO_NOTIFY),
            link: 'https://github.com/Embraser01/INSA-Planning-generator',
            copyright: 'Copyright (C) 2017 Marc-Antoine FERNANDES',
            author: {
                name: 'Marc-Antoine Fernandes',
                email: 'embraser01@gmail.com',
                link: 'https://github.com/Embraser01'
            }
        });

        feeds[if_year][grp] = {
            obj: feed,
            raw: feed.render('rss-2.0')
        };
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

    let start_group = Number(REGEX_CLASSNAME.exec(event.parentNode.className)[1]);
    if (!start_group) return;

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
    start.setSeconds(0);
    start.setMilliseconds(0);


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
    end.setSeconds(0);
    end.setMilliseconds(0);


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

    let event;

    for (let key in grp_planning_obj) {

        event = grp_planning_obj[key];

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


/**
 * Compare deux planning et renvoie des messages détaillés
 * @param old {Object} Ancien planning
 * @param recent {Object} Nouveau planning
 * @returns {Array} Messages détaillés
 */
function compare(old, recent) {
    if (!old || !recent) return [];


    let now = new Date();
    let max = new Date(now);
    max.setDate(max.getDate() + MAX_DAYS_TO_NOTIFY);

    let messages = [];


    let keysOld = Object.keys(old);
    let keysRecent = Object.keys(recent);

    let keys = keysOld.concat(keysRecent.filter(item => keysOld.indexOf(item) < 0));

    let oldEvent;
    let recentEvent;

    for (let key of keys) {
        if (key < now.getTime()) continue;
        if (key > max.getTime()) break;

        oldEvent = old[key];
        recentEvent = recent[key];

        // Si ajouter

        if (!oldEvent) {
            messages.push(
                {
                    title: 'Un cours a été ajouté',
                    description: utils.node.format("Le cours [%s] du %s a été ajouté",
                        recentEvent.title,
                        moment(recentEvent.start).format(FEED_DATE_FORMAT)
                    )
                }
            );
        }

        // Si enlevé

        if (!recentEvent) {
            messages.push(
                {
                    title: 'Un cours a été supprimé ou déplacé',
                    description: utils.node.format("Le cours [%s] du %s a été supprimé ou déplacé",
                        oldEvent.title,
                        moment(oldEvent.start).format(FEED_DATE_FORMAT)
                    )
                }
            );
        }

        if (!recentEvent || !oldEvent) continue;

        // Si remplacé

        if (oldEvent.title !== recentEvent.title) {
            messages.push(
                {
                    title: 'Un cours a été remplacé',
                    description: utils.node.format("Le cours [%s] du %s a été remplacé par [%s]",
                        oldEvent.title,
                        moment(oldEvent.start).format(FEED_DATE_FORMAT),
                        recentEvent.title
                    )
                }
            );
        }


        // Si durée modifiée

        if (oldEvent.end.getTime() !== recentEvent.end.getTime()) {
            messages.push(
                {
                    title: 'Un cours a été alongé',
                    description: utils.node.format("Le cours [%s] du %s finira à %s au lieu de %s",
                        recentEvent.title,
                        moment(oldEvent.start).format(FEED_DATE_FORMAT),
                        moment(recentEvent.end).format('HH:mm'),
                        moment(oldEvent.end).format('HH:mm')
                    )
                }
            );
        }

        // Si salle modifiée

        if (oldEvent.location !== recentEvent.location) {
            messages.push(
                {
                    title: 'Changement de salle',
                    description: utils.node.format("Changement de salle pour le cours [%s] du %s, nouvelle salle : %s",
                        recentEvent.title,
                        moment(oldEvent.start).format(FEED_DATE_FORMAT),
                        recentEvent.location
                    )
                }
            );
        }

        // Si prof modifiée

        if (oldEvent.description !== recentEvent.description) {
            messages.push(
                {
                    title: 'Changement d\'intervenant(s)',
                    description: utils.node.format("Changement d'intervenant(s) pour le cours [%s] du %s, intervenant(s) : %s",
                        recentEvent.title,
                        moment(oldEvent.start).format(FEED_DATE_FORMAT),
                        recentEvent.description
                    )
                }
            );
        }
    }

    return messages;
}


function updateRSSFeed(if_year, grp) {
    let messages = compare(cache[if_year][grp], planning[if_year][grp]);
    let feedObj = feeds[if_year][grp].obj;
    let now = new Date();

    // Prevent from overflow
    if (feedObj.items.length > MAX_FEED_SIZE) {
        feedObj.items.splice(0, feedObj.items.length - MAX_FEED_SIZE);
    }


    for (let message of messages) {
        feedObj.addItem({
            title: message.title,
            description: message.description,
            date: now
        });
    }

    feeds[if_year][grp].raw = feedObj.render('rss-2.0');
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

            updateRSSFeed(if_year, grp);

            if (error) console.log("Erreur lors de l'enregistrement du planning %dIF-GRP%d :", if_year, grp, error);
        }

        // On bouge le planning dans le cache
        cache[if_year] = planning[if_year];
        planning[if_year] = {};
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
            if (err) return console.log("Erreur lors du polling(1) :", err);

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
                if (err) return console.log("Erreur lors du polling(2) :", err);

                /**
                 * Fonction pour faire la requête vers l'emploi du temps en fonction de l'année
                 * @param if_year
                 */
                function responseParser(if_year) {
                    request({
                        url: EDT_LINK.replace(YEAR_VAR, '' + if_year),
                        headers: DEFAULT_HEADERS
                    }, function (err, res, body) {
                        if (err) return console.log("Erreur lors du polling(3) :", err);
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


app.get('/export/:num_year(\\d+)/:num_group(\\d+)', function (req, res, next) {

    let num_year = Number(req.params.num_year);
    let num_group = Number(req.params.num_group);

    // Si le groupe et l'année existent
    if (IF_SECTION[num_year] && IF_SECTION[num_year][num_group - IF_SECTION[num_year][0]]) {

        return res.sendFile(EXPORT_FOLDER + num_year + '/' + utils.node.format(FILE_NAME, num_group));
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
