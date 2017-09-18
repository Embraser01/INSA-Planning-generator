const ICS_FILE_HEADER = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//INSA/Promo//2019//Marc-Antoine F. Exporter v2.0//FR\n';

/**
 * Class representing an planning for a single group of a single year.
 */
exports.Planning = class {

    /**
     * Group concerned by this planning
     * @type {Number}
     */
    group;

    /**
     * Year concerned
     * @type {Number}
     */
    year;

    /**
     * Object containing all events of a group
     * @type {Object}
     */
    events;


    constructor(group, year) {
        this.group = group;
        this.year = year;
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
};