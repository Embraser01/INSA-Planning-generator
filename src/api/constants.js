const path = require('path');

module.exports = Object.freeze({

    //
    // BASE APP CONFIG
    //

    /**
     * Current scolar year
     * e.g. 2017-2018 ==> 2017
     *
     * @type {Number}
     */
    YEAR: 2017,

    //
    // EXPORT CONFIG
    //

    /**
     * File name of the exported planning
     *
     * '%d' will be replaced by the group number
     *
     * @type {string}
     */
    FILE_NAME: 'edt_grp%d.ics',

    /**
     * Export folder
     *
     * @type {string}
     */
    EXPORT_FOLDER: path.normalize(__dirname + '/../../export/'),


    //
    // RSS FEED CONFIG
    //

    /**
     * Number of days from today
     * That will be compared with old planning version
     *
     * @type {Number}
     */
    MAX_DAYS_TO_NOTIFY: 15,

    /**
     * Number of changes to remember
     *
     * @type {Number}
     */
    MAX_FEED_SIZE: 30,


    //
    // CAS INSA CONFIG
    //

    /**
     * Link to INSA CAS
     *
     * @type {string}
     */
    LOGIN_LINK: 'https://login.insa-lyon.fr/cas/login',

    /**
     * Default headers sent to the CAS
     *
     * Needed for the CAS (it does not take unknown User-agent)
     *
     * @type {Object}
     */
    DEFAULT_HEADERS: {
        'User-Agent': 'Mozilla/5.0'
    },


    //
    // IF SCHEDULE CONFIG
    //

    /**
     * Integrated year variable
     *
     * @type {string}
     */
    YEAR_VAR: '$if_year',

    /**
     * Link to the schedule
     *
     * @type {string}
     */
    EDT_LINK: `https://servif-cocktail.insa-lyon.fr/EdT/${this.YEAR_VAR}IF.php`,

    /**
     * IF Schedule start in September and end in July
     * So we take a middle week to determine what year an event is
     *
     * @type {Number}
     */
    MIDDLE_WEEK: 30,

    /**
     * HTML Table of a week is malformed and
     * use useless span to separate every hour.
     *
     * Moreover, an hour is 4 colSpan
     * so we have to know how is a single colSpan
     *
     * @type {Number}
     */
    NB_MIN_PER_SPAN: 15,


    //
    // PARSING CONFIG
    //

    /**
     * jQuery selector to select every event
     *
     * @type {string}
     */
    EVENT_SELECTOR: 'td[id|=slot]',

    /**
     * RegEx to get the week number and the day of the week of an event
     *
     * @type {RegExp}
     */
    REGEX_DATE: /S(\d+)-J(\d)/,

    /**
     * RegEx to get the start group of an event
     *
     * @type {RegExp}
     */
    REGEX_CLASSNAME: /row-group-(\d+)/,

    /**
     * RegEx to get multiple data from an event :
     *  - Hours
     *  - Minutes
     *  - useless
     *  - Location
     *
     * @type {RegExp}
     */
    REGEX_TIME_LOCATION: /(\d{2})h(\d{2})(\s@\s(?!-)(.*))?/,


    //
    // MISC
    //

    /**
     * IF Department structure
     *
     * @type {Object}
     */
    IF_SECTION: {
        3: [1, 2, 3, 4],
        4: [1, 2, 3, 4],
        5: [1, 2, 3, 4, 5]
    },
});