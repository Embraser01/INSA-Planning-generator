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

function normalize(str) {
    return str ? str.replace(new RegExp('&nbsp;', 'g'), '') : '';
}


function getEvent(event, planning_tab, min) {

    var padding = 0;

    if (event.id && event.id.indexOf(USE_WORD) > -1) {
        var year, week_num, day_num, start, end, bis_min;

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

        planning_tab.push({
            start: start,
            end: end,
            title: normalize(event.childNodes[0].childNodes[0].childNodes[0].childNodes[0].innerHTML),
            description: normalize(event.childNodes[0].childNodes[0].childNodes[1].childNodes[0].innerHTML),
            location: normalize(event.childNodes[0].childNodes[0].childNodes[1].childNodes[1].innerHTML.replace('@-', ''))
        });
    }
    return padding;
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

function exportCalendar(planning_tab, file) {
    var event;

    /*
     Maintenant on va créer un fichier iCal depuis le planning
     */

    var exportData = '';
    exportData += 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//lol/mdr//Marc-Antoine F. Exporter v0.1//FR\n';

    for (i = 0; i < planning_tab.length; i++) {
        event = planning_tab[i];

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

    return fs.writeFileSync(file, exportData);
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
var NB_GROUPS = 4;


fs.readFile('res/planning.html', 'utf8', function (err, data) {
    if (err) throw err;

    jsdom.env(data, [], function (err, window) {
        if (err) throw err;

        var document = window.document;


        /*
         On enleve tous les h2
         */

        var h2s = document.getElementsByTagName("h2");

        for (i = 0; i < h2s.length; i++) h2s[i].parentNode.removeChild(h2s[i]);


        /*
         On recupère les edt par jours
         */

        var weeks = document.querySelectorAll('table.edt') || [];
        var days = [];
        for (i = 0; i < weeks.length; i++)
            days = days.concat(Array.prototype.slice.call(weeks[i].querySelectorAll('.hour')));

        var day = {};
        var nb_days = 0;

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

        for (i = 0; i < days.length; i++) {
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
                nb_days++;
            } else if (day.className && day.className.indexOf("row-group-2") !== -1) {
                daysPerGroup.grp2.push(day);
                nb_days++;
            } else if (day.className && day.className.indexOf("row-group-3") !== -1) {
                daysPerGroup.grp3.push(day);
                nb_days++;
            } else if (day.className && day.className.indexOf("row-group-4") !== -1) {
                daysPerGroup.grp4.push(day);
                nb_days++;
            }
        }

        // On divise  par le nombre de groupe
        nb_days /= NB_GROUPS;

        /*
         Maintenant on recupère chaque cours du groupe 1
         */

        var event;

        var min, end_of_common_events; // On suppose que il n'y a jamais de cours communs après des cours en groupe
        var day_grp_1, day_grp_2, day_grp_3, day_grp_4;


        for (i = 0; i < nb_days; i++) {
            day_grp_1 = daysPerGroup.grp1[i];
            day_grp_2 = daysPerGroup.grp2[i];
            day_grp_3 = daysPerGroup.grp3[i];
            day_grp_4 = daysPerGroup.grp4[i];

            min = 8 * 60; // Chaque journée commence à 8h00
            end_of_common_events = 0;

            /*
             PLANNING SUR UN JOUR DU GROUPE 1 + CM
             */

            for (j = 0; j < day_grp_1.childNodes.length; j++) {
                event = day_grp_1.childNodes[j];

                // On garde la dernière heure ou il n'y avait pas de groupe
                if (event.rowSpan < NB_GROUPS && !end_of_common_events) end_of_common_events = min;

                if (event.rowSpan == NB_GROUPS) { // Si c'est un CM, on l'ajoute à tout le monde
                    getEvent(event, planning.grp2, min);
                    getEvent(event, planning.grp3, min);
                    getEvent(event, planning.grp4, min);
                }
                /*
                 On augmente le temps par rapport à la taille de la cellule
                 */

                min += NB_MIN_PER_SPAN * (Number(event.colSpan) + getEvent(event, planning.grp1, min));

                if (min >= 18 * 60) min = 8 * 60;
            }


            /*
             PLANNING SUR UN JOUR DU GROUPE 2
             */

            min = end_of_common_events;

            for (j = 0; j < day_grp_2.childNodes.length; j++) {
                event = day_grp_2.childNodes[j];

                min += NB_MIN_PER_SPAN * (Number(event.colSpan) + getEvent(event, planning.grp2, min));
                if (min >= 18 * 60) min = 8 * 60;
            }


            /*
             PLANNING SUR UN JOUR DU GROUPE 3
             */

            min = end_of_common_events;

            for (j = 0; j < day_grp_3.childNodes.length; j++) {
                event = day_grp_3.childNodes[j];

                min += NB_MIN_PER_SPAN * (Number(event.colSpan) + getEvent(event, planning.grp3, min));
                if (min >= 18 * 60) min = 8 * 60;
            }


            /*
             PLANNING SUR UN JOUR DU GROUPE 4
             */

            min = end_of_common_events;

            for (j = 0; j < day_grp_4.childNodes.length; j++) {
                event = day_grp_4.childNodes[j];

                min += NB_MIN_PER_SPAN * (Number(event.colSpan) + getEvent(event, planning.grp4, min));
                if (min >= 18 * 60) min = 8 * 60;
            }
        }

        /*
         On exporte les calendrier au format iCal
         */

        var errors = [];

        errors.push(exportCalendar(planning.grp1, "res/edt_grp1.ics"));
        errors.push(exportCalendar(planning.grp2, "res/edt_grp2.ics"));
        errors.push(exportCalendar(planning.grp3, "res/edt_grp3.ics"));
        errors.push(exportCalendar(planning.grp4, "res/edt_grp4.ics"));

        console.log("OUTPUT :", errors);
    });
});