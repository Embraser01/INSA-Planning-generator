const cheerio = require('cheerio');
const moment = require('moment');
const request = require('request-promise-native').defaults({ jar: true });

const { LOGIN_LINK, DEFAULT_HEADERS, YEAR_VAR, IF_SECTION, EDT_LINK } = require('./api/constants');
const { exporter, parser, feed } = require('./api/');
const passwordManager = require('./api/password-manager');

const UPDATER_CONFIG = {};

/**
 * This function connect to CAS (w/ cookies)
 */
function casLogin() {
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
                username: UPDATER_CONFIG.login,
                password: passwordManager.decrypt(UPDATER_CONFIG.password),
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
    console.log(`${moment()}: Start planning update`);
    const start = Date.now();

    try {
        await casLogin();
        await Promise.all(Object.keys(IF_SECTION)
            .map(year => loadSchedule(year)
                .then($ => [...parser.parseHTML($, year)])
                .then(parsedPlannings => {
                    exporter.savePlannings(parsedPlannings);
                    return parsedPlannings;
                })
                .then(parsedPlannings => feed.updateRSSFeed(parsedPlannings))
                .catch(err => console.error(`Unable to update planning ${year}IF`, err.message))
            ));

        console.log(`${moment()}: Plannings were updated, it took ${(Date.now() - start) / 1000}s !`);
    } catch (e) {
        console.error(`${moment()}: Error while updating plannings`, e);
    }
}

let timeout;

function startInterval() {
    timeout = setTimeout(() => update().then(startInterval), UPDATER_CONFIG.interval * 60 * 60 * 1000);
}

module.exports = {
    /**
     * Start updater service
     * @param config
     */
    start(config) {
        if (!config.login) throw new Error('Field `login` was not provided !');
        if (!config.password) throw new Error('Field `password` was not provided !');
        if (!config.interval) throw new Error('Field `interval` was not provided !');

        UPDATER_CONFIG.login = config.login;
        UPDATER_CONFIG.password = config.password;
        UPDATER_CONFIG.interval = config.interval;

        update().then(startInterval);
    },
    /**
     * Stop updater service
     */
    stop() {
        clearTimeout(timeout);
    },

    update
};

