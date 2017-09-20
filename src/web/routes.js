const { Router } = require('express');
const { feed, exporter } = require('../api');
const { IF_SECTION } = require('../api/constants');

const routes = new Router();

/**
 * Utility to know if a tuple (year, group) exists
 * @param year {Number} Year (e.g. 4)
 * @param group {Number} Group (e.g. 2)
 * @returns {boolean} true if the group exists
 */
function groupExists(year, group) {
    return !IF_SECTION[year] || IF_SECTION[year].indexOf(group) === -1;
}

/**
 * Route to the ICS File
 */
routes.get('/export/:year(\\d+)/:group(\\d+)', (req, res, next) => {
    const year = +req.params.year;
    const group = +req.params.group;

    if (!groupExists(year, group)) return next();

    return res.sendFile(exporter.getExportedFilePath(year, group));
});

/**
 * Route for the RSS Feed
 */
routes.get('/rss/:year(\\d+)/:group(\\d+)', (req, res, next) => {
    const year = +req.params.year;
    const group = +req.params.group;

    if (!groupExists(year, group)) return next();

    return res.send(feed.getFeedByYearAndGroup(year, group).raw);
});

module.exports = routes;