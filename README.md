# Générateur d'emplois du temps - INSA Lyon

[![license](https://img.shields.io/github/license/Embraser01/INSA-Planning-generator.svg)](./LICENSE.md)
[![David](https://img.shields.io/david/Embraser01/INSA-Planning-generator/class-refactoring.svg)](https://david-dm.org/embraser01/INSA-Planning-generator)
[![David](https://img.shields.io/david/dev/Embraser01/INSA-Planning-generator/class-refactoring.svg)](https://david-dm.org/embraser01/INSA-Planning-generator)
[![Travis](https://img.shields.io/travis/Embraser01/INSA-Planning-generator/class-refactoring.svg)](https://travis-ci.org/Embraser01/INSA-Planning-generator)
[![Codecov branch](https://img.shields.io/codecov/c/github/Embraser01/INSA-Planning-generator/class-refactoring.svg)](https://codecov.io/gh/Embraser01/INSA-Planning-generator/branch/class-refactoring)

## Presentation

  Serveur NodeJS qui génère les emplois du temps du département INFO de l'INSA Lyon sous la forme de fichier .ics, compatible avec la majorité des calendriers.
  
  L'application actualise l'ensemble des emplois du temps toutes les heures.

## Utilisation avec Google calendar

L'application est totalement compatible avec Google calendar (mis à jour tous les jours).
Pour avoir le calendrier sur Google :

- Aller sur [Google calendar](https://calendar.google.com)
- Dans le panel à gauche, cliquer sur les 3 points au niveau de "Autres agendas"
- "Ajouter par URL"
- Rentrer l'adresse : https://calendar.example.com/export/:année/:groupe (remplacer :année et :groupe par les valeurs voulues et `calendar.example.com` par le lien du serveur utilisé)

N.B. : Si le serveur est éteint, l'emploi du temps restera visible mais ne sera plus mis à jour.

## Serveur de demo

Un serveur est actuellement en route sur cete adresse : `https://calendar.insa.finch4.xyz/`.
Il n'y a aucune garantie que le serveur fonctionne en permanence !

## Mise en ligne

### Dépendance

-  [Node JS](https://nodejs.org) V8.3+
  

### Téléchargement et installation des dépendances

Cloner le repo avec Git :
```bash
git clone https://github.com/Embraser01/INSA-Planning-generator.git
```

Installer les dépendances

```bash
cd INSA-Planning-generator/
npm install
```

###  Configuration

- La configuration se fait par le fichier `build.js` :

```bash
node build.js
```

- Pour du SSL, modifier le fichier `config.js`


### Lancer le serveur

```bash
npm start
```

Pour le lancer avec screen :

```bash
#!/bin/bash
echo "(Re)démarrage du serveur calendrier INSA"
if screen -list | grep -q "calendrier_insa"; then
  screen -S calendrier_insa -X quit
fi
cd /path/to/INSA-Planning-generator
screen -dmS calendrier_insa npm start
```


## Licence

[Copyright (C) 2017  Marc-Antoine FERNANDES](./LICENSE.md)
