const fs = require('fs');
const { format } = require('util');
const { EXPORT_FOLDER, FILE_NAME } = require('./constants');


/**
 * Enregistre une liste de Plannings
 * @param {Array<Planning>} plannings
 */
function savePlannings(plannings) {

    plannings.forEach(p => {
        const y = p.year;
        const g = p.group;
        const filePath = EXPORT_FOLDER + y + '/' + format(FILE_NAME, g);

        // On vérifie si un fichier existe déjà, si oui et que le planning est vide, on ne fait rien
        if (Object.keys(p.events).length === 0 && fs.existsSync(filePath)) return;

        // On crée un dossier s'il n'existe pas
        if (!fs.existsSync(EXPORT_FOLDER + y)) fs.mkdirSync(EXPORT_FOLDER + y);

        fs.writeFileSync(filePath, p.toString());
    });
}

module.exports = { savePlannings };