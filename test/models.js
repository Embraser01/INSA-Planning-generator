const should = require('should');
const moment = require('moment');

const { Planning, PlanningEvent } = require('../src/models');

const start1 = moment('2017-10-23 08:00:00');
const end1 = moment('2017-10-23 10:00:00');

describe('Models', () => {
    describe('Event', () => {
        it('should create a correct ICS event', () => {
            const event = new PlanningEvent(
                start1.toDate(),
                end1.toDate(),
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
                start1.toDate(),
                end1.toDate(),
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

        it('should not bug if empty', () => {
            const planning = new Planning(4, 3);

            planning.toString().should.not.throw().and.be.equal(
                'BEGIN:VCALENDAR\n' +
                'VERSION:2.0\n' +
                'PRODID:-//INSA/Promo//2019//Marc-Antoine F. Exporter v2.0//FR\n' +
                'END:VCALENDAR'
            );
        });

        it('should add all events of the good group', () => {
            const planning = new Planning(4, 3);

            planning.addAllEvent([
                new PlanningEvent(start1.toDate(), end1.toDate(), 'Ev1', '', null, [2, 3]),
                new PlanningEvent(start1.add(1, 'day').toDate(), end1.add(1, 'day').toDate(), 'Ev2', '', null, [2]),
                new PlanningEvent(start1.add(2, 'day').toDate(), end1.add(2, 'day').toDate(), 'Ev3', '', null, [2, 3]),
                new PlanningEvent(start1.add(3, 'day').toDate(), end1.add(3, 'day').toDate(), 'Ev4', '', null, [2, 3]),
            ]);

            Object.keys(planning.events).should.be.lengthOf(3);
        });


        it('should generate with events', () => {
            const planning = new Planning(4, 3);

            planning.addAllEvent([
                new PlanningEvent(start1.toDate(), end1.toDate(), 'Ev1', '', null, [2, 3]),
                new PlanningEvent(start1.add(1, 'day').toDate(), end1.add(1, 'day').toDate(), 'Ev2', '', null, [2, 3]),
            ]);

            planning.toString().should.not.throw().and.not.be.equal(
                'BEGIN:VCALENDAR\n' +
                'VERSION:2.0\n' +
                'PRODID:-//INSA/Promo//2019//Marc-Antoine F. Exporter v2.0//FR\n' +
                'END:VCALENDAR'
            );
        });
    });

    describe('Comparison between two plannings', () => {

        it('no change', () => {
            // TODO : Tests
        });

        it('added lesson', () => {
            // TODO : Tests
        });

        it('removed lesson', () => {
            // TODO : Tests
        });

        it('replaced lesson', () => {
            // TODO : Tests
        });

        it('longer lesson', () => {
            // TODO : Tests
        });

        it('location change', () => {
            // TODO : Tests
        });

        it('description change', () => {
            // TODO : Tests
        });

        it('do not notify after delay', () => {
            // TODO : Tests
        });
    });
});