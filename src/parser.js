const moment = require('moment');

const { PlanningEvent, Planning } = require('./models/');
const { YEAR, NB_MIN_PER_SPAN, EVENT_SELECTOR, IF_SECTION, REGEX_TIME_LOCATION, REGEX_CLASSNAME } = require('./constants');


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
    const timeAndLocation = REGEX_TIME_LOCATION.exec(details.first().text());
    const [, week_num, day_num] = REGEX_DATE.exec($(event).attr('id'));

    let nb_min = +timeAndLocation[1] * 60 + +timeAndLocation[2];

    // On choisi l'année en fonction du numero de semaine
    event.start = moment({ year: week_num > MIDDLE_WEEK ? YEAR : YEAR + 1 })
        .add({
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

    event.end = moment(event.start)
        .add({
            m: NB_MIN_PER_SPAN * (colSpan + padding)
        }).toDate();

    //
    // Location de l'évenement
    //
    event.location = timeAndLocation[4];

    return event;
}


/**
 * Parse le document HTML pour générer une liste de planning
 *
 * @param $ Cheerio instance
 * @param if_year {Number} Numéro de l'année
 * @return {Array<Planning>} planning
 */
function parseHTML($, if_year) {
    const plannings = [];

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

module.exports = { parseEvent, parseHTML };