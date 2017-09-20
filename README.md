# Générateur d'emplois du temps - INSA Lyon

[![license](https://img.shields.io/github/license/Embraser01/INSA-Planning-generator.svg)](./LICENSE.md)
[![David](https://img.shields.io/david/Embraser01/INSA-Planning-generator.svg)](https://david-dm.org/embraser01/INSA-Planning-generator)
[![David](https://img.shields.io/david/dev/Embraser01/INSA-Planning-generator.svg)](https://david-dm.org/embraser01/INSA-Planning-generator)
[![Travis](https://img.shields.io/travis/Embraser01/INSA-Planning-generator.svg)](https://travis-ci.org/Embraser01/INSA-Planning-generator)
[![Codecov branch](https://img.shields.io/codecov/c/github/Embraser01/INSA-Planning-generator.svg)](https://codecov.io/gh/Embraser01/INSA-Planning-generator/)

## Presentation

  Serveur NodeJS qui génère les emplois du temps du département INFO de l'INSA Lyon sous la forme de fichier .ics, compatible avec la majorité des calendriers.
  
  L'application actualise l'ensemble des emplois du temps toutes les heures.
  
## Serveur de demo

Un serveur est actuellement en route sur cete adresse : `https://calendar.insa.finch4.xyz/`.
Il n'y a aucune garantie que le serveur fonctionne en permanence !

## Utilisation avec Google calendar

L'application est totalement compatible avec Google calendar (mis à jour tous les jours).
Pour avoir le calendrier sur Google :

- Aller sur [Google calendar](https://calendar.google.com)
- Dans le panel à gauche, cliquer sur les 3 points au niveau de "Autres agendas"
- "Ajouter par URL"
- Rentrer l'adresse : https://calendar.example.com/export/:année/:groupe (remplacer :année et :groupe par les valeurs voulues et `calendar.example.com` par le lien du serveur utilisé)

N.B. : Si le serveur est éteint, l'emploi du temps restera visible mais ne sera plus mis à jour.

### Example

Donc par exemple pour récupérer l'emplois du temps du **groupe 2** des **3IF**
il suffit de rajouter ce lien là :
   `https://calendar.insa.finch4.xyz/export/3/2`
   
## Flux RSS

Un flux _rss_ est disponible sur cette URL `https://calendar.example.com/rss/:année/:groupe`.
Il détecte les différents changements d'emplois du temps à 3 semaines:
  - Ajout d'un cours
  - Suppression d'un cours
  - Remplacement d'un cours
  - Modification d'un cours (enseignants, durée, salle)


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
yarn #npm install
```

###  Configuration

- Pour configurer le serveur :

```bash
yarn run build #npm run build
```

Le fichier de configuration ressemble à ceci : 

- **ENCRYPTION_KEY**: (String) Encryption key used to crypt the password (`aes-256-cbc` with IV), must be a 32 characters string
- **WEB**: (Object) Contains the configuration of the web part :
    * **ssl**: (Boolean) Activate the HTTPS server.
    * **sslCert**: (String) Path to the SSL certificate file.
    * **sslKey**: (String) Path to the SSL key file.
- **UPDATER**: (Object) Contains the configuration of the updater part (it's where the magic happens):
    * **password**: (String) Password used to access plannings (encrypted).
    * **login**: (String) Login name used to access plannings.
    * **interval**: (Number) Time between intervals (in hours)

### Lancer le serveur

```bash
yarn start #npm start
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
