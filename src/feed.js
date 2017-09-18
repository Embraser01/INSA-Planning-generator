
const FEED_DATE_FORMAT = 'DD/MM à HH:mm';




/**
 * Compare deux planning et renvoie des messages détaillés
 * @param old {Object} Ancien planning
 * @param recent {Object} Nouveau planning
 * @returns {Array} Messages détaillés
 */
function compare(old, recent) {
    if (!old || !recent) return [];


    let now = new Date();
    let max = new Date(now);
    max.setDate(max.getDate() + MAX_DAYS_TO_NOTIFY);

    let messages = [];


    let keysOld = Object.keys(old);
    let keysRecent = Object.keys(recent);

    let keys = keysOld.concat(keysRecent.filter(item => keysOld.indexOf(item) < 0));

    let oldEvent;
    let recentEvent;

    for (let key of keys) {
        if (key < now.getTime()) continue;
        if (key > max.getTime()) break;

        oldEvent = old[key];
        recentEvent = recent[key];

        // Si ajouter

        if (!oldEvent) {
            messages.push(
                {
                    title: 'Un cours a été ajouté',
                    description: util.node.format("Le cours [%s] du %s a été ajouté",
                        recentEvent.title,
                        moment(recentEvent.start).format(FEED_DATE_FORMAT)
                    )
                }
            );
        }

        // Si enlevé

        if (!recentEvent) {
            messages.push(
                {
                    title: 'Un cours a été supprimé ou déplacé',
                    description: util.node.format("Le cours [%s] du %s a été supprimé ou déplacé",
                        oldEvent.title,
                        moment(oldEvent.start).format(FEED_DATE_FORMAT)
                    )
                }
            );
        }

        if (!recentEvent || !oldEvent) continue;

        // Si remplacé

        if (oldEvent.title !== recentEvent.title) {
            messages.push(
                {
                    title: 'Un cours a été remplacé',
                    description: util.node.format("Le cours [%s] du %s a été remplacé par [%s]",
                        oldEvent.title,
                        moment(oldEvent.start).format(FEED_DATE_FORMAT),
                        recentEvent.title
                    )
                }
            );
        }


        // Si durée modifiée

        if (oldEvent.end.getTime() !== recentEvent.end.getTime()) {
            messages.push(
                {
                    title: 'Un cours a été alongé',
                    description: util.node.format("Le cours [%s] du %s finira à %s au lieu de %s",
                        recentEvent.title,
                        moment(oldEvent.start).format(FEED_DATE_FORMAT),
                        moment(recentEvent.end).format('HH:mm'),
                        moment(oldEvent.end).format('HH:mm')
                    )
                }
            );
        }

        // Si salle modifiée

        if (oldEvent.location !== recentEvent.location) {
            messages.push(
                {
                    title: 'Changement de salle',
                    description: util.node.format("Changement de salle pour le cours [%s] du %s, nouvelle salle : %s",
                        recentEvent.title,
                        moment(oldEvent.start).format(FEED_DATE_FORMAT),
                        recentEvent.location
                    )
                }
            );
        }

        // Si prof modifiée

        if (oldEvent.description !== recentEvent.description) {
            messages.push(
                {
                    title: 'Changement d\'intervenant(s)',
                    description: util.node.format("Changement d'intervenant(s) pour le cours [%s] du %s, intervenant(s) : %s",
                        recentEvent.title,
                        moment(oldEvent.start).format(FEED_DATE_FORMAT),
                        recentEvent.description
                    )
                }
            );
        }
    }

    return messages;
}


function updateRSSFeed(if_year, grp) {
    let messages = compare(cache[if_year][grp], planning[if_year][grp]);
    let feedObj = feeds[if_year][grp].obj;
    let now = new Date();

    // Prevent from overflow
    if (feedObj.items.length > MAX_FEED_SIZE) {
        feedObj.items.splice(0, feedObj.items.length - MAX_FEED_SIZE);
    }


    for (let message of messages) {
        feedObj.addItem({
            title: message.title,
            description: message.description,
            date: now
        });
    }

    feeds[if_year][grp].raw = feedObj.rss2();
}