// TODO Requete vers le site ! (en attendant : fichier local)


function getDateOfISOWeek(w, y) {
    var simple = new Date(y, 0, 1 + (w - 1) * 7);
    var dow = simple.getDay();
    var ISOweekStart = simple;
    if (dow <= 4)
        ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    else
        ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    return ISOweekStart;
}

function pad(str, max) {
    str = str.toString();
    return str.length < max ? pad("0" + str, max) : str;
}


function getVCalDate(date) {
    return ''
        + date.getUTCFullYear()
        + pad(date.getUTCMonth() + 1, 2)
        + pad(date.getUTCDate(), 2)
        + 'T'
        + pad(date.getUTCHours(), 2)
        + pad(date.getUTCMinutes(), 2)
        + '00Z';
}

var fs = require('fs');
var jsdom = require('jsdom');
var i, j, k;
var MIDDLE_WEEK = 30;
var FIRST_YEAR = 2016;
var SECOND_YEAR = 2017;
var REGEX_DATE = /S(\d+)-J(\d)/;
var USE_WORD = "slot";
var NB_MIN_PER_SPAN = 15;


fs.readFile('res/planning.html', 'utf8', function (err, data) {
    if (err) throw err;

    jsdom.env(data, [], function (err, window) {
        if (err) throw err;

        var document = window.document;


        /*
         On enleve tous les h2
         */

        var h2s = document.getElementsByTagName("h2"), index;

        for (index = h2s.length - 1; index >= 0; index--) {
            h2s[index].parentNode.removeChild(h2s[index]);
        }

        /*
         On recupère les edt par jours
         */

        var weeks = document.querySelectorAll('table.edt') || [];
        var days = [];
        for (index = weeks.length - 1; index >= 0; index--) {
            days = days.concat(Array.prototype.slice.call(weeks[index].querySelectorAll('.hour')));
        }
        var day = {};

        var daysPerGroup = {
            grp1: [],
            grp2: [],
            grp3: [],
            grp4: []
        };
        var planning = {
            grp1: [],
            grp2: [],
            grp3: [],
            grp4: []
        };

        console.log("Importation de %d semaines en cours", weeks.length);

        for (i = days.length - 1; i >= 0; i--) {
            day = days[i];

            for (j = 0; j < day.childNodes.length;) { // On enlève les TH, les séparateurs
                if (day.childNodes[j].tagName !== "TD" || day.childNodes[j].className === "week-separator") {
                    day.removeChild(day.childNodes[j]);
                } else {
                    j++;
                }
            }
            if (day.className && day.className.indexOf("row-group-1") !== -1) {
                daysPerGroup.grp1.push(day);
            } else if (day.className && day.className.indexOf("row-group-2") !== -1) {
                daysPerGroup.grp2.push(day);
            } else if (day.className && day.className.indexOf("row-group-3") !== -1) {
                daysPerGroup.grp3.push(day);
            } else if (day.className && day.className.indexOf("row-group-4") !== -1) {
                daysPerGroup.grp4.push(day);
            }
        }

        /*
         Maintenant on recupère chaque cours du groupe 1
         */

        var event;
        var year, week_num, day_num, start, end;
        var min, bis_min, padding;

        for (i = 0; i < daysPerGroup.grp1.length; i++) {
            day = daysPerGroup.grp1[i];
            min = 8 * 60; // Chaque journée commence à 8h00

            for (j = 0; j < day.childNodes.length; j++) {
                event = day.childNodes[j];

                padding = 0;

                if (event.id && event.id.indexOf(USE_WORD) > -1) {

                    bis_min = min;

                    for (k = event.colSpan - 1; k > 0; k--) {
                        bis_min += NB_MIN_PER_SPAN;
                        if (bis_min % 60 === 0) {
                            padding--;
                            k--;
                        }
                    }

                    week_num = Number(REGEX_DATE.exec(event.id)[1]);
                    day_num = Number(REGEX_DATE.exec(event.id)[2]);
                    year = week_num > MIDDLE_WEEK ? FIRST_YEAR : SECOND_YEAR;
                    start = getDateOfISOWeek(week_num, year);
                    start.setDate(start.getDate() + day_num - 1);
                    start.setMinutes(min);

                    end = new Date(start.getTime());
                    end.setMinutes(end.getMinutes() + NB_MIN_PER_SPAN * (Number(event.colSpan) + padding));

                    planning.grp1.push({
                        start: start,
                        end: end,
                        title: event.childNodes[0].childNodes[0].childNodes[0].childNodes[0].innerHTML.replace(new RegExp('&nbsp;', 'g'), ''),
                        description: event.childNodes[0].childNodes[0].childNodes[1].childNodes[0].innerHTML.replace(new RegExp('&nbsp;', 'g'), ''),
                        location: event.childNodes[0].childNodes[0].childNodes[1].childNodes[1].innerHTML.replace('@-', '').replace(new RegExp('&nbsp;', 'g'), '')
                    });
                }
                /*
                 On augmente le temps par rapport à la taille de la cellule
                 */

                min += NB_MIN_PER_SPAN * (Number(event.colSpan) + padding);


                if (min >= 18 * 60) min = 8 * 60;
            }
        }

        /*
         Maintenant on créer un fichier iCal depuis le planning
         */


        var exportData = '';

        exportData += 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//lol/mdr//Marc-Antoine F. Exporter v0.1//FR\n';

        for (i = 0; i < planning.grp1.length; i++) {
            event = planning.grp1[i];

            console.log(getVCalDate(event.start));

            exportData += 'BEGIN:VEVENT\n';
            exportData += 'DTSTART:' + getVCalDate(event.start) + '\n';
            exportData += 'DTEND:' + getVCalDate(event.end) + '\n';
            exportData += 'SUMMARY:' + event.title + '\n';
            exportData += 'LOCATION:' + event.location + '\n';
            exportData += 'DESCRIPTION:' + event.description + '\n';
            exportData += 'END:VEVENT\n';
        }

        exportData += 'END:VCALENDAR';

        fs.writeFile("res/export.ics", exportData, function (err) {
            if (err) {
                return console.log(err);
            }
            console.log("The file was saved at res/export.ics!");
        });
    });
});