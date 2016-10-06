# INSA-Planning-generator

## Presentation

  Serveur NodeJS qui génère les emplois du temps du département INFO de l'INSA Lyon sous la forme de fichier .ics, compatible avec la majorité des calendrier.

## Mise en ligne

### Dépendance

-  [Node JS](https://nodejs.org) V6.7.0+
  

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
node app.js
```

Pour le lancer avec screen :

```bash
#!/bin/bash
echo "(Re)démarrage du serveur calendrier INSA"
if screen -list | grep -q "calendrier_insa"; then
  screen -S calendrier_insa -X quit
fi
cd /path/to/INSA-Planning-generator
screen -dmS calendrier_insa node app.js
```


## Licence

[Copyright (C) 2016  Marc-Antoine FERNANDES](https://github.com/Embraser01/INSA-Planning-generator/blob/master/LICENSE.md)
