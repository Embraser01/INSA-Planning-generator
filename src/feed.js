const Feed = require('feed');

const { MAX_FEED_SIZE, IF_SECTION } = require('./constants');
const { Planning } = require('./models');

class PlanningsFeed {

    /**
     * List of planning used for caching
     * @type {Array<Planning>}
     */
    oldPlannings;

    /**
     * List of plannings
     * @type {Array<Planning>}
     */
    newPlannings;

    /**
     * List of feeds to serve in web app
     * @type {Array} Feed (inside a container)
     */
    feeds;

    constructor() {
        this.oldPlannings = [];
        this.newPlannings = [];
        this.feeds = feedInit();
    }

    /**
     * Find the feed of the same year and same group
     *
     * @param year Year
     * @param group Group
     * @returns {Object} feed container or undefined
     */
    getFeedByYearAndGroup(year, group) {
        return this.feeds.find(feed => feed.year === year && feed.group === group);
    }

    /**
     * Update RSS Feed from new plannings
     * @param newPlannings
     */
    updateRSSFeed(newPlannings) {
        this.oldPlannings = this.newPlannings;
        this.newPlannings = newPlannings;

        const now = new Date();

        // Compare each planning with its old version
        this.oldPlannings.forEach(old => {
            newPlannings.forEach(newP => {
                if (newP.year !== old.year || newP.group !== old.group) return;

                const feed = this.getFeedByYearAndGroup(newP.year, newP.group);

                // Prevent from overflow
                if (feed.obj.items.length > MAX_FEED_SIZE) {
                    feed.obj.items.splice(0, feed.obj.items.length - MAX_FEED_SIZE);
                }

                Planning.compare(old, newP).forEach(message => feed.obj.addItem({
                    title: message.title,
                    description: message.description,
                    date: now
                }));

                // Update raw rss
                feed.raw = feed.obj.rss2();
            });
        });
    }
}

/**
 * Create feed for each group of each year
 * @returns {Array} list of feeds
 */
function feedInit() {
    const feeds = [];

    for (const year in IF_SECTION) {
        for (const grp of IF_SECTION[year]) {
            const feed = new Feed({
                title: `Emploi du temps ${year}IF-Grp.${grp}`,
                description: `Feed permettant de notifier des changements d'emploi du temps sur les ${MAX_DAYS_TO_NOTIFY} prochains jours`,
                link: 'https://github.com/Embraser01/INSA-Planning-generator',
                copyright: 'Copyright (C) 2017 Marc-Antoine FERNANDES',
                author: {
                    name: 'Marc-Antoine Fernandes',
                    email: 'embraser01@gmail.com',
                    link: 'https://github.com/Embraser01'
                }
            });

            feeds.push({
                obj: feed,
                raw: feed.rss2(),
                year,
                grp
            });
        }
    }

    return feeds;
}

module.exports = new PlanningsFeed();