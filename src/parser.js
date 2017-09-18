const moment = require('moment');

const PlanningEvent = require('./models/event');


// Base app configuration
const YEAR = 2017;

// INSA EDT IF Specific

const MIDDLE_WEEK = 30;
const NB_MIN_PER_SPAN = 15;

// REGEXs & selectors
const REGEX_DATE = /S(\d+)-J(\d)/;
const REGEX_CLASSNAME = /row-group-(\d+)/;
const REGEX_TIME_LOCATION = /(\d{2})h(\d{2})(\s@\s(?!-)(.*))?/;


/**
 * Parse un DOM HTML en un objet {@type PlanningEvent}
 * @param $ Cheerio instance
 * @param event {Object} Evenement en version HTML
 * @return {PlanningEvent} Evénement
 */
function parseEvent($, event) {
    const event = new PlanningEvent();

    //
    // Informations sur l'évenement
    //

    const details = $('tr', event).last().children();

    event.title = $('tr', event).first().text();
    event.description = details.last().text();

    //
    // Groupes concernés
    //
    const start_group = +REGEX_CLASSNAME.exec($(event).parent().attr('class'))[1];
    const end_group = start_group + +$(event).attr('rowspan');
    event.groups = Array.from({ length: end_group - start_group }, (v, k) => k + start_group);


    //
    // Date de l'évenement
    //
    const [, hour, minutes, , location] = REGEX_TIME_LOCATION.exec(details.first().text());
    const [, week_num, day_num] = REGEX_DATE.exec($(event).attr('id'));
    const year = week_num > MIDDLE_WEEK ? YEAR : YEAR + 1; // Choix de l'année en fonction du numéro de semaine

    let nb_min = +hour * 60 + +minutes;

    event.start = moment({ year }).add({
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

    event.end = moment(event.start).add({
        m: NB_MIN_PER_SPAN * (colSpan + padding)
    }).toDate();

    return event;
}


/**
 * Parse le document HTML pour récupérer à la fin un .ics
 * @param $ Cheerio instance
 * @param if_year {Number} Numéro de l'année
 */
function parseHTML($, if_year) {

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

module.exports = {};