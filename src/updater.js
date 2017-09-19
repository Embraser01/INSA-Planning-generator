const cheerio = require('cheerio');
const request = require('request-promise-native').defaults({ jar: true });

const { LOGIN_LINK, DEFAULT_HEADERS, YEAR_VAR, IF_SECTION, INTERVAL, EDT_LINK } = require('./constants');
const passwordManager = require('./password-manager');
const parser = require('./parser');
const exporter = require('./exporter');
const feed = require('./feed');

const CONFIG = {};

/**
 * This function connect to CAS (w/ cookies)
 */
function casLogin() {
    /* istanbul ignore next: depends heavily on INSA CAS so trust me */
    return request({
        uri: LOGIN_LINK,
        transform: body => cheerio.load(body) // Load DOM
    }).then($ => {
        const execution = $('input[name="execution"]').val();
        const lt = $('input[name="lt"]').val();

        /*
         Maintenant on se connecte (représenté par le cookie "AGIMUS")
         */
        return request({
            uri: LOGIN_LINK,
            method: 'POST',
            form: {
                username: CONFIG.login,
                password: passwordManager.decrypt(CONFIG.password),
                lt: lt,
                execution: execution,
                _eventId: 'submit'
            },
            headers: DEFAULT_HEADERS
        });
    });
}

/**
 * Request schedule (after login)
 * @param year Which year
 * @return {Promise} request promise
 */
function loadSchedule(year) {
    /* istanbul ignore next: depends on the link ot the planning so no test for this */
    return request({
        uri: EDT_LINK.replace(YEAR_VAR, year),
        headers: DEFAULT_HEADERS,
        transform: body => cheerio.load(body, { decodeEntities: true })
    });
}


/**
 * Met à jour les tous les emplois du temps
 */
async function update() {
    /* istanbul ignore next: sure part (just call some functions) */
    try {
        await casLogin();
        const plannings = Object.keys(IF_SECTION).map(async year => {
            const $ = await loadSchedule(year);
            return parser.parseHTML($, year);
        });
        exporter.savePlannings(plannings);
        feed.updateRSSFeed(plannings);
    } catch (e) {
        console.error('Error while updating plannings', e);
    }
}

let timeout;

function startInterval() {
    /* istanbul ignore next: sure part (just call update function) */
    timeout = setTimeout(() => {
        update()
            .then(startInterval)
            .catch(err => {
                console.error('Error ', err);
                startInterval();
            });
    }, CONFIG.interval * 60 * 60 * 1000);
}

/* istanbul ignore next: nearly impossible to test this part */
module.exports = {
    /**
     * Start updater service
     * @param config
     */
    start(config) {
        if (!config.login) throw new Error('Field login was not provided !');
        if (!config.password) throw new Error('Field password was not provided !');
        if (!config.interval) console.warn('Field interval was not provided, using default value');

        CONFIG.login = config.login;
        CONFIG.password = config.password;
        CONFIG.interval = config.interval || INTERVAL;

        startInterval();
    },
    /**
     *
     */
    stop() {
        clearTimeout(timeout);
    }
};

