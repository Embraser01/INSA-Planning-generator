const moment = require('moment');
const { format } = require('util');

const ICS_FILE_HEADER = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//INSA/Promo//2019//Marc-Antoine F. Exporter v2.0//FR\n';
const FEED_DATE_FORMAT = 'DD/MM à HH:mm';

/**
 * Class representing an planning for a single group of a single year.
 */
module.exports.Planning = class {

    constructor(year, group) {
        /**
         * Group concerned by this planning
         * @type {Number}
         */
        this.group = group;

        /**
         * Year concerned
         * @type {Number}
         */
        this.year = year;

        /**
         * Object containing all events of a group
         * @type {Object}
         */
        this.events = {};
    }


    /**
     * Add an array of events to the planning
     * An event is added only if it has the corresponding group
     *
     * @param {Array<PlanningEvent>} events
     */
    addAllEvent(events) {
        events.forEach(event => {
            if (event.groups.indexOf(this.group) === -1) return;
            this.events[event.start.getTime()] = event;
        });
    }

    /**
     * Return a complete ICAL file
     * @return {string} ICAL planning
     */
    toString() {
        return Object
                .keys(this.events)
                .map(key => this.events[key])
                .reduce((a, b) => a + b.toString(), ICS_FILE_HEADER)
            + 'END:VCALENDAR';
    }


    /**
     * Compare two plannings and return a list of changes
     * @param old {Planning} old planning
     * @param recent {Planning} new planning
     * @param max_day_to_notify number of days to look forward
     * @returns {Array} List of messages
     */
    static compare(old, recent, max_day_to_notify) {
        const messages = [];

        const now = new Date();
        const max = new Date(now);
        max.setDate(max.getDate() + max_day_to_notify);

        const keysOld = Object.keys(old.events);
        const keysRecent = Object.keys(recent.events);

        const allKeys = keysOld.concat(keysRecent.filter(item => keysOld.indexOf(item) < 0));

        for (const key of allKeys) {
            if (key < now.getTime()) continue;
            if (key > max.getTime()) break;

            const oldEvent = old[key];
            const recentEvent = recent[key];

            // Si ajouter
            if (!oldEvent) {
                messages.push({
                    title: 'Un cours a été ajouté',
                    description: format("Le cours [%s] du %s a été ajouté",
                        recentEvent.title,
                        moment(recentEvent.start).format(FEED_DATE_FORMAT)
                    )
                });
            }

            // Si enlevé
            if (!recentEvent) {
                messages.push({
                    title: 'Un cours a été supprimé ou déplacé',
                    description: format("Le cours [%s] du %s a été supprimé ou déplacé",
                        oldEvent.title,
                        moment(oldEvent.start).format(FEED_DATE_FORMAT)
                    )
                });
            }

            if (!recentEvent || !oldEvent) continue;

            // Si remplacé
            if (oldEvent.title !== recentEvent.title) {
                messages.push({
                    title: 'Un cours a été remplacé',
                    description: format("Le cours [%s] du %s a été remplacé par [%s]",
                        oldEvent.title,
                        moment(oldEvent.start).format(FEED_DATE_FORMAT),
                        recentEvent.title
                    )
                });
            }


            // Si durée modifiée
            if (oldEvent.end.getTime() !== recentEvent.end.getTime()) {
                messages.push({
                    title: 'Un cours a été alongé',
                    description: format("Le cours [%s] du %s finira à %s au lieu de %s",
                        recentEvent.title,
                        moment(oldEvent.start).format(FEED_DATE_FORMAT),
                        moment(recentEvent.end).format('HH:mm'),
                        moment(oldEvent.end).format('HH:mm')
                    )
                });
            }

            // Si salle modifiée
            if (oldEvent.location !== recentEvent.location) {
                messages.push({
                    title: 'Changement de salle',
                    description: format("Changement de salle pour le cours [%s] du %s, nouvelle salle : %s",
                        recentEvent.title,
                        moment(oldEvent.start).format(FEED_DATE_FORMAT),
                        recentEvent.location
                    )
                });
            }

            // Si prof modifiée
            if (oldEvent.description !== recentEvent.description) {
                messages.push({
                    title: "Changement d'intervenant(s)",
                    description: format("Changement d'intervenant(s) pour le cours [%s] du %s, intervenant(s) : %s",
                        recentEvent.title,
                        moment(oldEvent.start).format(FEED_DATE_FORMAT),
                        recentEvent.description
                    )
                });
            }
        }


        return messages;
    }
};