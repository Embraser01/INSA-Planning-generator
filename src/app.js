/*
 INSA-Planning-generator  Copyright (C) 2017  Marc-Antoine FERNANDES
 This program comes with ABSOLUTELY NO WARRANTY; for details type `show w'.
 This is free software, and you are welcome to redistribute it
 under certain conditions; type `show c' for details.
 */

//=================================//
//===== VARIABLES & CONSTANTS =====//
//=================================//


// Modules

const fs = require('fs');
const cheerio = require('cheerio');
const request = require('request-promise-native').defaults({ jar: true });
const express = require('express');
const path = require('path');
const Feed = require('feed');
const util = require('util');

// Application

const passwordManager = require('./password-manager');

const app = express();

const CONFIG = JSON.parse(fs.readFileSync('./config.json').toString());



// Global variables

let planning = {};
let cache = {};
let feeds = {};

// Init feeds & planning
for (let if_year in IF_SECTION) {
    feeds[if_year] = {};
    cache[if_year] = {};
    planning[if_year] = {};
    for (let grp of IF_SECTION[if_year]) {

        let feed = new Feed({
            title: `Emploi du temps ${if_year}IF-Grp.${grp}`,
            description: `Feed permettant de notifier des changements d'emploi du temps sur les ${MAX_DAYS_TO_NOTIFY} prochains jours`,
            link: 'https://github.com/Embraser01/INSA-Planning-generator',
            copyright: 'Copyright (C) 2017 Marc-Antoine FERNANDES',
            author: {
                name: 'Marc-Antoine Fernandes',
                email: 'embraser01@gmail.com',
                link: 'https://github.com/Embraser01'
            }
        });

        feeds[if_year][grp] = {
            obj: feed,
            raw: feed.rss2()
        };
    }
}


//===============//
//===== APP =====//
//===============//


