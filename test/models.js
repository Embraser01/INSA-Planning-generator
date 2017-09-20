const should = require('should');
const moment = require('moment');

const { Planning, PlanningEvent } = require('../src/api/models');

const start1 = moment('2017-10-23 08:00:00');
const end1 = moment('2017-10-23 10:00:00');

describe('Models', function () {
    describe('Event', function () {
        it('should create a correct ICS event', function () {
            const event = new PlanningEvent(
                start1.toDate(),
                end1.toDate(),
                'My awesome event',
                'With candies and happiness !',
                'My place',
            ).toString();

            event.should.be.equal(
                'BEGIN:VEVENT\n' +
                'DTSTART;TZID=Europe/Paris:20171023T080000\n' +
                'DTEND;TZID=Europe/Paris:20171023T100000\n' +
                'SUMMARY:My awesome event\n' +
                'LOCATION:My place\n' +
                `DESCRIPTION:With candies and happiness !(exporté le ${moment().format('DD/MM/YYYY')})\n` +
                'END:VEVENT\n'
            );
        });

        it('should not display location if not provided', function () {
            const event = new PlanningEvent(
                start1.toDate(),
                end1.toDate(),
                'My awesome event',
                'With candies and happiness !',
            ).toString();

            event.should.be.equal(
                'BEGIN:VEVENT\n' +
                'DTSTART;TZID=Europe/Paris:20171023T080000\n' +
                'DTEND;TZID=Europe/Paris:20171023T100000\n' +
                'SUMMARY:My awesome event\n' +
                `DESCRIPTION:With candies and happiness !(exporté le ${moment().format('DD/MM/YYYY')})\n` +
                'END:VEVENT\n'
            );
        });
    });

    describe('Planning', function () {

        it('should not bug if empty', function () {
            const planning = new Planning(4, 3);

            planning.toString().should.not.throw().and.be.equal(
                'BEGIN:VCALENDAR\n' +
                'VERSION:2.0\n' +
                'PRODID:-//INSA/Promo//2019//Marc-Antoine F. Exporter v2.0//FR\n' +
                'END:VCALENDAR'
            );
        });

        it('should add all events of the good group', function () {
            const planning = new Planning(4, 3);

            planning.addAllEvent([
                new PlanningEvent(start1.toDate(), end1.toDate(), 'Ev1', '', null, [2, 3]),
                new PlanningEvent(start1.add(1, 'day').toDate(), end1.add(1, 'day').toDate(), 'Ev2', '', null, [2]),
                new PlanningEvent(start1.add(2, 'day').toDate(), end1.add(2, 'day').toDate(), 'Ev3', '', null, [2, 3]),
                new PlanningEvent(start1.add(3, 'day').toDate(), end1.add(3, 'day').toDate(), 'Ev4', '', null, [2, 3]),
            ]);

            Object.keys(planning.events).should.be.lengthOf(3);
        });


        it('should generate with events', function () {
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

    describe('Comparison between two plannings', function () {

        it('no change', function () {
            // TODO : Tests
        });

        it('added lesson', function () {
            // TODO : Tests
        });

        it('removed lesson', function () {
            // TODO : Tests
        });

        it('replaced lesson', function () {
            // TODO : Tests
        });

        it('longer lesson', function () {
            // TODO : Tests
        });

        it('location change', function () {
            // TODO : Tests
        });

        it('description change', function () {
            // TODO : Tests
        });

        it('do not notify after delay', function () {
            // TODO : Tests
        });
    });
});