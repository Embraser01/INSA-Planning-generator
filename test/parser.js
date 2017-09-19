const should = require('should');
const cheerio = require('cheerio');
const moment = require('moment');

const parser = require('../src/parser');
const {PlanningEvent} = require('../src/models');
const {EVENT_SELECTOR} = require('../src/constants');

describe('Parsing', () => {
    describe('event', () => {
        it('should return the correct event', () => {
            const $ = cheerio.load(`
                <th class="hour-header row-group-1">4IF1</th>
                    <td id="slot-S43-J1-0-0" colspan="19" rowspan="1" class="Slot-TP Title-504C44204D415253">
                        <table class="container">
                            <tr>
                                <td colspan="2" style="text-align: center;">PLD MARS [TP-Gr.4IF1]</td>
                            </tr>
                            <tr>
                                <td style="text-align: left;">08h00 @&nbsp;501:212, 501:213 </td>
                                <td style="text-align: right;">Y.&nbsp;Gripay, S.&nbsp;Servigne </td>
                            </tr>
                        </table>
                    </td>
            `);

            const event = parser.parseEvent($, $(EVENT_SELECTOR));

            event.should.be.instanceOf(PlanningEvent);
            event.should.have.property('groups').with.lengthOf(1).containEql(1);
            event.should.have.property('title').which.equal('PLD MARS [TP-Gr.4IF1]');
            event.should.have.property('description').which.startWith('Y. Gripay, S. Servigne');
            event.should.have.property('location').which.startWith('501:212, 501:213');
            event.should.have.property('start').which.is.Date().and.eql(moment('2017-10-23 08:00:00').toDate());
            event.should.have.property('end').which.is.Date().and.eql(moment('2017-10-23 12:00:00').toDate());
        });

        it('should return an event without location if "-"', () => {

        });

        it('should return an event without if not present', () => {

        });
    });

    describe('document HTML', () => {

    });
});