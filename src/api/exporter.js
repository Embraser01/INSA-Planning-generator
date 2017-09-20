const fs = require('fs');
const { format } = require('util');
const { EXPORT_FOLDER, FILE_NAME } = require('./constants');

/**
 * Enregistre une liste de Plannings
 * @param {Array<Planning>} plannings
 */
function savePlannings(plannings) {
    if (!plannings) return;

    plannings.forEach(p => {
        if (!p) return;

        const y = p.year;
        const g = p.group;
        const filePath = getExportedFilePath(y, g);

        // On vérifie si un fichier existe déjà, si oui et que le planning est vide, on ne fait rien
        if (Object.keys(p.events).length === 0 && fs.existsSync(filePath)) return;

        // On crée un dossier s'il n'existe pas
        if (!fs.existsSync(getExportFolderPath(y))) fs.mkdirSync(getExportFolderPath(y));

        fs.writeFileSync(filePath, p.toString());
    });
}

/**
 * Return path to the folder containing year's plannings
 * @param year Year
 * @return {string} Folder path without a trailing '/'
 */
function getExportFolderPath(year) {
    return EXPORT_FOLDER + year;
}

/**
 * Return path to the file corresponding to the year and the group
 * @param year Year
 * @param group Group
 * @return {string} File path
 */
function getExportedFilePath(year, group) {
    return getExportFolderPath(year) + '/' + format(FILE_NAME, group);
}

module.exports = { savePlannings, getExportedFilePath, getExportFolderPath };