const moment = require('moment');

const { PlanningEvent, Planning } = require('./models/index');
const {
    YEAR, NB_MIN_PER_SPAN, EVENT_SELECTOR, IF_SECTION, REGEX_TIME_LOCATION,
    REGEX_CLASSNAME, REGEX_DATE, MIDDLE_WEEK
} = require('./constants');


/**
 * Parse un DOM HTML en un objet {@type PlanningEvent}
 * @param $ Cheerio instance
 * @param event {Object} Evenement en version HTML
 * @return {PlanningEvent} Evenement
 */
function parseEvent($, event) {
    const planningEvent = new PlanningEvent();

    //
    // Informations sur l'évenement
    //
    const details = $('tr', event).last().children();

    planningEvent.title = $('tr', event).first().text().trim();
    planningEvent.description = details.last().text().trim();

    //
    // Groupes concernés
    //
    const start_group = +REGEX_CLASSNAME.exec($(event).parent().attr('class'))[1];
    const end_group = start_group + +$(event).attr('rowspan');
    planningEvent.groups = Array.from({ length: end_group - start_group }, (v, k) => k + start_group);


    //
    // Date de l'évenement
    //
    const timeAndLocation = REGEX_TIME_LOCATION.exec(details.first().text());
    const [, week_num, day_num] = REGEX_DATE.exec($(event).attr('id'));

    let nb_min = +timeAndLocation[1] * 60 + +timeAndLocation[2];

    // On choisi l'année en fonction du numero de semaine
    planningEvent.start = moment({ year: week_num > MIDDLE_WEEK ? YEAR : YEAR + 1 })
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

    planningEvent.end = moment(planningEvent.start)
        .add({
            m: NB_MIN_PER_SPAN * (colSpan + padding)
        }).toDate();

    //
    // Location de l'évenement
    //
    planningEvent.location = timeAndLocation[4];

    return planningEvent;
}


/**
 * Parse le document HTML pour générer une liste de planning
 *
 * @param $ Cheerio instance
 * @param if_year {Number} Numéro de l'année
 * @return {Array<Planning>} planning
 */
function parseHTML($, if_year) {

    // On récupère tous les evenements
    // On utilise ici `module.exports.parseEvent()` pour pouver spy avec sinonjs
    const allEvents = $(EVENT_SELECTOR).map((i, event) => module.exports.parseEvent($, event)).get();

    // On initialise les plannings de if_year
    // et on ajoutes les events aux
    // différents plannings (ils sont ajoutés seulement si c'est le bon groupe)
    const plannings = IF_SECTION[if_year]
        .map(grp => new Planning(if_year, grp));

    plannings.forEach(planning => planning.addAllEvent(allEvents));

    return plannings;
}

module.exports = { parseEvent, parseHTML };