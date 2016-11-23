/*jslint devel: true, node: true, plusplus: true, nomen: true, bitwise: true*/
'use strict';

(function () {
    var playerManagement = require('./playerManagement.js'),
        dotenv = require('dotenv').config(),
        scoreManagement = require('./scoreManagement.js'),
        calculations = require('./calculations.js'),
        osuapi = require('osu-api'),
        osu = new osuapi.Api(process.env.osuApi, osuapi.Modes.osu),
        Promise = require('promise');

    module.exports.gains = function (name, db, channel) {
        playerManagement.findPlayerName(name, db, function (items) {
            if (items.length !== 0) {
                channel.sendMessage("Today,** " + items[0].name + "** got **" + parseFloat(items[0].totalpp).toFixed(2) + "**pp and **" + items[0].totalrank + "** ranks.")
                    .then()
                    .catch(function (e) {
                        console.log(e);
                    });
            } else {
                channel.sendMessage("User was not found in the database");
            }
        });
    };

    module.exports.getUser = function (user, channel) {
        //avgRequests.requestsTotal++;
        osu.getUser(user, 1, function (err, obj) {
            if (err) {
                console.log("Error retrieving user object: " + err);
            } else if (obj) {
                //console.log("Server responded with an user object: " + obj);
                channel.sendMessage("Player Name: **" + obj.username + " "
                    + "\n(https://osu.ppy.sh/u/" + obj.user_id + ")" + '**\nGlobal Rank: **' + obj.pp_rank
                    + '** \nPP: **' + obj.pp_raw + '**\nAccuracy: **' + Math.round(obj.accuracy * 100) / 100 + " %**.");
            }
        });
    };

    module.exports.botSetGame = function (game, bot) {
        return new Promise(function (fullfill, reject) {
            bot.setGame(game)
                .then(fullfill)
                .catch(function (e) {
                    reject(e);
                });
        });
    };

    module.exports.botStart = function () {
        console.log("Starting the bot..");
        interval = setInterval(function () {
            playerManagement.findPlayers(function (items) {
                items.forEach(function (entry) {
                    scoreManagement.retrieveMostRecent(entry, function () {
                        playerManagement.getUserUpdate(entry, function () {
                            //console.log("Done updating user " + entry.name);
                        });
                    });
                });
            });
        }, 30000);
    };

    module.exports.getInfo = function (channel, server, avgRequests) {
        /*global toHHMMSS*/
        channel.sendMessage("**Global:** ```\nRequests per minute: " + parseFloat((avgRequests.requestsTotal / avgRequests.timeRunning) * 60).toFixed(2) + "\nTime running: " + calculations.toHHMMSS(avgRequests.timeRunning) + "\nRequests: " + avgRequests.requestsTotal + "```\n**Server:**\n```Is currently logging: " + server.botStarted + "\nIs currently tracking: " + server.trackStarted + "```");
    };

}());
