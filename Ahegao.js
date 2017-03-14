/*jslint devel: true, node: true, plusplus: true, nomen: true, bitwise: true*/
"use strict";

var Discord = require("discord.js"),
    mybot = new Discord.Client(),
    CronJob = require('cron').CronJob,
    basicCommands = require('./basicCommands.js'),
    messageHandler = require('./messageHandler.js'),
    connections = require('./connections.js'),
    scoreManagement = require('./scoreManagement.js'),
    playerManagement = require('./playerManagement'),
    serverManagement = require('./serverManagement.js'),
    messageManagement = require('./messageManagement.js'),
    dotenv = require('dotenv').config(),
    db,
    interval,
    started = false,
    osuapi = require('osu-api'),
    osu = new osuapi.Api(process.env.osuApi, osuapi.Modes.osu),

    job = new CronJob({
        cronTime: '59 59 23 * * 0-6',
        onTick: function () {
            serverManagement.findServers(db, function (servers) {
                servers.forEach(function (server) {
                    playerManagement.printPlayerList(mybot.channels.get(server._id), db)
                        .then(function (playersArr) {
                            if (playersArr.length !== 0) {
                                playersArr.sort((a, b) => a.name.localeCompare(b.name));
                                messageManagement.printGainsMessage(playersArr, mybot.channels.get(server._id));
                            }
                        });
                });
            });
            playerManagement.resetPlayerStats(db)
                .then(function () {
                    console.log("Refreshed PP and Ranks");
                }, function (err) {
                    console.log("Error refreshing ranks " + err);
                });
        },
        start: false,
        timeZone: 'Europe/Copenhagen'
    });
job.start();

function botStart() {
    console.log("Starting the bot..");
    interval = setInterval(function () {
        playerManagement.returnPlayers(db, function (items) {
            items.forEach(function (entry) {
                scoreManagement.retrieveMostRecent(entry, osu, db, mybot, function () {
                    playerManagement.getUserUpdate(mybot, entry, db, function () {
                        console.log("Done updating user " + entry.name);
                    });
                });
            });
        });
    }, 15000);
}

function main() {
    connections.loginToDatabase()
        .then(function (database) {
            db = database;
            connections.loginWithToken(mybot);
        }, function (err) {
            console.log(err);
        })
        .catch(function (err) {
            console.log(err);
        });
    botStart();

    mybot.on('ready', function () {
        if (!started) {
            console.log('I am ready!');
            started = true;
            basicCommands.botSetGame("a Renyan WanWan", mybot.user)
                .then(function () {
                    messageHandler.onMessage(mybot, db);
                }, function () {
                    console.log("Error");
                })
                .catch(function (e) {
                    console.log(e);
                });
        }
    });
}

main();