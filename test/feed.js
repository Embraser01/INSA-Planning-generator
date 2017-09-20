const should = require('should');
const feed = require('../src/api/feed');
const { IF_SECTION } = require('../src/api/constants');

describe('Feed', function () {

    it('should init all the feeds', function () {
        const count = Object.keys(IF_SECTION).reduce((a, b) => a + IF_SECTION[b].length, 0);

        feed.feeds.should.length(count);
    });

    it('should find a feed', function () {

        // IMPORTANT : Should not change anyway
        const obj = feed.getFeedByYearAndGroup(3, 2);

        should.exist(obj);
        obj.year.should.equal(3);
        obj.group.should.equal(2);
    });

});