const should = require('should');
const sinon = require('sinon');
const moment = require('moment');
require('should-sinon');

const { Planning, PlanningEvent } = require('../src/models');

describe('Models', () => {
    describe('Event', () => {
        it('should create a correct ICS event', () => {
            const event = new PlanningEvent(
                moment('2017-10-23 08:00:00'),
                moment('2017-10-23 10:00:00'),
                'My awesome event',
                'With candies and happiness !',
                'My place',
            ).toString();

            event.should.be.equal(
                'BEGIN:VEVENT\n' +
                'DTSTART:20171023T080000Z\n' +
                'DTEND:20171023T100000Z\n' +
                'SUMMARY:My awesome event\n' +
                'LOCATION:My place\n' +
                `DESCRIPTION:With candies and happiness !(exporté le ${moment().format('DD/MM/YYYY')})\n` +
                'END:VEVENT\n'
            );
        });

        it('should not display location if not provided', () => {
            const event = new PlanningEvent(
                moment('2017-10-23 08:00:00'),
                moment('2017-10-23 10:00:00'),
                'My awesome event',
                'With candies and happiness !',
            ).toString();

            event.should.be.equal(
                'BEGIN:VEVENT\n' +
                'DTSTART:20171023T080000Z\n' +
                'DTEND:20171023T100000Z\n' +
                'SUMMARY:My awesome event\n' +
                `DESCRIPTION:With candies and happiness !(exporté le ${moment().format('DD/MM/YYYY')})\n` +
                'END:VEVENT\n'
            );
        });
    });

    describe('Planning', () => {


    });
});