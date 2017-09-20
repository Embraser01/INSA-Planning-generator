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
    try {
        await casLogin();
        let plannings = [];

        for (const year of Object.keys(IF_SECTION)) {
            const $ = await loadSchedule(year);
            plannings.push(...parser.parseHTML($, year));
        }
        exporter.savePlannings(plannings);
        feed.updateRSSFeed(plannings);
        console.log(`Plannings were updated on ${moment().format('lll')} !`);
    } catch (e) {
        console.error('Error while updating plannings', e);
    }
}

let timeout;

function startInterval() {
    timeout = setTimeout(() => {
        update()
            .then(startInterval)
            .catch(err => {
                console.error('Error ', err);
                startInterval();
            });
    }, UPDATER_CONFIG.interval * 60 * 60 * 1000);
}


function noop() {
}

module.exports = {
    /**
     * Start updater service
     * @param config
     */
    start(config) {
        if (!config.login) throw new Error('Field `login` was not provided !');
        if (!config.password) throw new Error('Field `password` was not provided !');
        if (!config.interval) console.warn('Field `interval` was not provided, using default value');

        UPDATER_CONFIG.login = config.login;
        UPDATER_CONFIG.password = config.password;
        UPDATER_CONFIG.interval = config.interval;

        startInterval();
        update().then(noop).catch(noop);
    },
    /**
     *
     */
    stop() {
        clearTimeout(timeout);
    },

    update
};

