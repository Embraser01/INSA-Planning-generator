const moment = require('moment');

/**
 * Official date format for an ICS event
 * @type {string}
 */
const ICS_DATE_FORMAT = 'YYYYMMDD[T]HHmmss[Z]';

/**
 * Class representing an event.
 *
 * The event is based on an ICS event
 */
module.exports.PlanningEvent = class {

    constructor(start, end, title, description, location, groups) {
        /**
         * When the event starts
         * @type {Date}
         */
        this.start = start;

        /**
         * When the event stops
         * @type {Date}
         */
        this.end = end;

        /**
         * Title of the event
         * @type {String}
         */
        this.title = title;

        /**
         * Description of the event
         * @type {String}
         */
        this.description = description;

        /**
         * Location of the event
         * @type {String}
         */
        this.location = location;

        /**
         * List of groups concerned by the event
         * @type {Array<Number>}
         */
        this.groups = groups;
    }

    /**
     * Return a string in ICAL format containing data about the event
     * @return {string} ICAL event
     */
    toString() {
        let str = 'BEGIN:VEVENT\n';
        str += 'DTSTART:' + moment(this.start).format(ICS_DATE_FORMAT) + '\n';
        str += 'DTEND:' + moment(this.end).format(ICS_DATE_FORMAT) + '\n';
        str += 'SUMMARY:' + this.title + '\n';
        if (this.location) str += 'LOCATION:' + this.location + '\n';
        str += 'DESCRIPTION:' + this.description + '(exporté le ' + moment().format('DD/MM/YYYY') + ')\n';
        str += 'END:VEVENT\n';
        return str;
    }
};