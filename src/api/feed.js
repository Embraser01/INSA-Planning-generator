const Feed = require('feed');

const { MAX_FEED_SIZE, MAX_DAYS_TO_NOTIFY, IF_SECTION } = require('./constants');
const { Planning } = require('./models/planning');

class PlanningsFeed {

    constructor() {
        /**
         * List of planning used for caching
         * @type {Array<Planning>}
         */
        this.oldPlannings = [];

        /**
         * List of plannings
         * @type {Array<Planning>}
         */
        this.newPlannings = [];

        /**
         * List of feeds to serve in web app
         * @type {Array} Feed (inside a container)
         */
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
        return this.feeds.find(feed => feed.year == year && feed.group == group);
    }

    /**
     * Update RSS Feed from new plannings
     * @param newPlannings
     */
    updateRSSFeed(newPlannings) {
        const now = new Date();

        newPlannings.forEach(newP => {
            const oldIndex = this.oldPlannings.findIndex(p => p.year === newP.year && p.group === newP.group);

            if (oldIndex === -1) return this.oldPlannings.push(newP);

            const feed = this.getFeedByYearAndGroup(newP.year, newP.group);

            // Prevent from overflow
            if (feed.obj.items.length > MAX_FEED_SIZE) {
                feed.obj.items.splice(0, feed.obj.items.length - MAX_FEED_SIZE);
            }

            Planning.compare(this.oldPlannings[oldIndex], newP).forEach(message => feed.obj.addItem({
                title: message.title,
                description: message.description,
                date: now
            }));

            // Update raw rss
            feed.raw = feed.obj.rss2();

            // The new planning replace the old
            this.oldPlannings[oldIndex] = newP;
        });
    }
}

/**
 * Create feed for each group of each year
 * @returns {Array} list of feeds
 */
function feedInit() {
    const feeds = [];

    for (const year of Object.keys(IF_SECTION)) {
        for (const group of IF_SECTION[year]) {
            const feed = new Feed({
                title: `Emploi du temps ${year}IF-Grp.${group}`,
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
                year: parseInt(year),
                group
            });
        }
    }

    return feeds;
}

module.exports = new PlanningsFeed();