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

const fs = require('fs');
const cheerio = require('cheerio');
const request = require('request-promise-native').defaults({ jar: true });
const moment = require('moment');
const express = require('express');
const path = require('path');
const Feed = require('feed');

const utils = require('./utils');

const app = express();

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

const EVENT_SELECTOR = 'td[id|=slot]';
const YEAR_VAR = '$if_year';
const EDT_LINK = 'https://servif-cocktail.insa-lyon.fr/EdT/' + YEAR_VAR + 'IF.php';
const MIDDLE_WEEK = 30;
const REGEX_DATE = /S(\d+)-J(\d)/;
const REGEX_CLASSNAME = /row-group-(\d+)/;
const REGEX_TIME_LOCATION = /(\d{0,2})h(\d{2})( @ (.*))?/;
const NB_MIN_PER_SPAN = 15;

const IF_SECTION = {
    3: [1, 2, 3, 4],
    4: [1, 2, 3, 4],
    5: [1, 2, 3, 4, 5]
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
            raw: feed.rss2()
        };
    }
}


//===============//
//===== APP =====//
//===============//


/**
 * Rajoute un évenement à un tableau
 * @param $ Cheerio instance
 * @param event {Object} Evenement en version HTML
 */
function getEvent($, event) {
    //
    // Informations sur l'évenement
    //
    const details = $('tr', event).last().children();
    const title = $('tr', event).first().text();
    const description = details.last().text();
    const [, hour, minutes, , location] = REGEX_TIME_LOCATION.exec(details.first().text());

    //
    // Groupes concernés
    //
    const start_group = +REGEX_CLASSNAME.exec($(event).parent().attr('class'))[1];
    const end_group = start_group + +$(event).attr('rowspan');
    const groups = Array.from({ length: end_group - start_group }, (v, k) => k + start_group);

    //
    // Date de l'évenement
    //
    const [, week_num, day_num] = REGEX_DATE.exec($(event).attr('id'));
    const year = week_num > MIDDLE_WEEK ? YEAR : YEAR + 1; // Choix de l'année en fonction du numéro de semaine

    let nb_min = hour * 60 + minutes;

    const start = moment({ year }).add({
        w: week_num - 1, // Date is already initialized at the first week
        d: day_num,
        m: nb_min,
    }).toDate();

    // On enlève les marges invisibles

    const colSpan = +$(event).attr('colspan');

    let padding = 0;
    for (let i = colSpan - 1; i > 0; i--) {
        nb_min += NB_MIN_PER_SPAN;
        if (nb_min % 60 === 0) {
            padding--;
            i--;
        }
    }

    const end = moment(start).add({
        m: NB_MIN_PER_SPAN * (colSpan + padding)
    }).toDate();

    // On renvoie un evenement propre
    return { start, end, title, description, location, groups };
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
        if (event.location) exportData += 'LOCATION:' + event.location + '\n';
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

    feeds[if_year][grp].raw = feedObj.rss2();
}


/**
 * Parse le document HTML pour récupérer à la fin un .ics
 * @param $ Cheerio instance
 * @param if_year {Number} Numéro de l'année
 */
function parse($, if_year) {

    /*
     On initialise les plannings de if_year
     */

    for (const grp of IF_SECTION[if_year]) {
        planning[if_year][grp] = {};
    }

    /*
     On récupère tous les evenements et on les transforme en objet qu'on enregistre
     */

    $(EVENT_SELECTOR).each((i, event) => {
        const eventObject = getEvent($, event);

        if (!eventObject) return;

        for (const grp of eventObject.groups) {
            planning[if_year][grp][eventObject.start.getTime()] = eventObject;
        }
    });


    /*
     Maintenant, on peut exporté le planning pour chaque groupe
     */

    let error;
    for (const grp of IF_SECTION[if_year]) {
        error = exportCalendar(planning[if_year][grp], if_year, grp);

        updateRSSFeed(if_year, grp);

        if (error) console.log("Erreur lors de l'enregistrement du planning %dIF-GRP%d :", if_year, grp, error);
    }

    // On bouge le planning dans le cache
    cache[if_year] = planning[if_year];
    planning[if_year] = {};

    console.log(`Planning des ${if_year}IF générés !`);
}

/**
 * Met à jour les tous les emplois du temps
 */
function update() {

    let execution = '';
    let lt = '';

    /*
     On récupère la page de login pour récupérer les variables "execution" & "lt" (sécurité)
     */
    request({
        uri: LOGIN_LINK,
        transform: body => cheerio.load(body) // Load DOM
    }).then($ => {
        execution = $('input[name="execution"]').val();
        lt = $('input[name="lt"]').val();

        /*
         Maintenant on se connecte (représenté par le cookie "AGIMUS")
         */
        return request({
            uri: LOGIN_LINK,
            method: 'POST',
            form: {
                username: CONFIG.login,
                password: utils.decrypt(CONFIG.password, CONFIG.KEY),
                lt: lt,
                execution: execution,
                _eventId: 'submit'
            },
            headers: DEFAULT_HEADERS
        });
    }).then(() => {

        // Pour chaque années, on fabrique les calendriers de chaque groupes
        for (let i in IF_SECTION) {
            request({
                uri: EDT_LINK.replace(YEAR_VAR, '' + i),
                headers: DEFAULT_HEADERS,
                transform: body => cheerio.load(body, { decodeEntities: true })
            })
                .then($ => parse($, i))
                .catch(err => console.log("Erreur lors du polling(3) :", err));
        }

    }).catch(err => console.log("Erreur lors du polling(1) :", err));
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
