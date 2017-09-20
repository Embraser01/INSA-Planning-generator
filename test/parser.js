const should = require('should');
const cheerio = require('cheerio');
const sinon = require('sinon');
const moment = require('moment');
const fs = require('fs');

const parser = require('../src/api/parser');
const { PlanningEvent, Planning } = require('../src/api/models');
const { EVENT_SELECTOR } = require('../src/api/constants');

describe('Parsing', function () {
    describe('event', function () {
        it('should return the correct event', function () {
            const $ = cheerio.load(`
                <table>
                    <tr class="hour row-group-1">
                        <td id="slot-S43-J1-0-0" colspan="19" rowspan="1" class="Slot-TP Title-504C44204D415253">
                            <table class="container">
                                <tr>
                                    <td colspan="2" style="text-align: center;">PLD MARS [TP-Gr.4IF1]</td>
                                </tr>
                                <tr>
                                    <td style="text-align: left;">08h00 @&nbsp;501:212, 501:213 </td>
                                    <td style="text-align: right;">Y. Gripay, S. Servigne </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            `);

            const event = parser.parseEvent($, $(EVENT_SELECTOR));

            event.should.be.instanceOf(PlanningEvent);
            event.should.have.property('groups').which.is.eql([1]);
            event.should.have.property('title').which.equal('PLD MARS [TP-Gr.4IF1]');
            event.should.have.property('description').which.startWith('Y. Gripay, S. Servigne');
            event.should.have.property('location').which.startWith('501:212, 501:213');
            event.should.have.property('start').which.is.Date().and.eql(moment('2017-10-23 08:00:00').toDate());
            event.should.have.property('end').which.is.Date().and.eql(moment('2017-10-23 12:00:00').toDate());
        });

        it('should return an event without location if "-"', function () {
            // TODO : Tests
        });

        it('should return an event without if not present', function () {
            // TODO : Tests
        });
    });

    describe('document HTML', function () {

        it('should find 73 events from resource', function () {
            const parseEvent = sinon.spy(parser, 'parseEvent');
            const addAllEvent = sinon.spy(Planning.prototype, 'addAllEvent');

            parser.parseHTML(cheerio.load(fs.readFileSync(__dirname + '/res/data-1.html')), 4)
                .should.not.throw();

            parseEvent.callCount.should.be.equal(73);
            addAllEvent.callCount.should.be.equal(4);
        });
    });
});